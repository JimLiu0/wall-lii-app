import { Suspense } from 'react';
import { supabase } from '@/utils/supabaseClient';
import PlayerProfile from './_components/PlayerProfile';
import { Metadata } from 'next';
import { redirect } from 'next/navigation';
import PlayerNotFound from './_components/PlayerNotFound';
import { normalizeUrlParams, toNewUrlParams, hasOldFormat } from '@/utils/urlParams';
import { fetchPlayerData, generatePlayerMetadata, PlayerData, resolveSelection } from './_lib/data';
import DashboardCard from '@/components/shared/DashboardCard';


interface PageParams {
  player: string;
}

interface SearchParams {
  // Old format (for backwards compatibility)
  r?: string;
  v?: string;
  o?: string;
  g?: string;
  // New format
  region?: string;
  mode?: string;
  view?: string;
  date?: string;
}

interface PageProps {
  params: Promise<PageParams>;
  searchParams: Promise<SearchParams>;
}

// ISR: Generate static params for popular players
export async function generateStaticParams() {
  // Fetch top players to pre-generate their pages
  // Use a fixed date or remove the date filter to avoid dynamic behavior
  const { data: topPlayers } = await supabase
    .from('daily_leaderboard_stats')
    .select(`
      player_id,
      players!inner(player_name)
    `)
    .order('day_start', { ascending: false })
    .limit(100);

  if (!topPlayers) return [];

  const uniquePlayers = new Set<string>();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  topPlayers.forEach((player: any) => {
    const playerName = player?.players?.player_name;
    if (typeof playerName === 'string' && playerName.length > 0) {
      uniquePlayers.add(playerName.toLowerCase());
    }
  });

  return Array.from(uniquePlayers).map((player) => ({ player }));
}

// ISR: Revalidate every 5 minutes
export const revalidate = 300;

export async function generateMetadata({ params }: { params: Promise<PageParams> }): Promise<Metadata> {
  const resolvedParams = await params;
  const decodedPlayer = decodeURIComponent(resolvedParams.player.toLowerCase());
  return generatePlayerMetadata(decodedPlayer);
}

export default async function PlayerPage({
  params,
  searchParams,
}: PageProps) {
  const [resolvedParams, resolvedSearchParams] = await Promise.all([
    params,
    searchParams
  ]);
  const player = decodeURIComponent(resolvedParams.player.toLowerCase());
  
  // Check if old format is being used and redirect to new format
  if (hasOldFormat(resolvedSearchParams)) {
    const normalized = normalizeUrlParams(resolvedSearchParams);
    const params = toNewUrlParams({
      region: normalized.region,
      mode: normalized.mode,
      view: normalized.view,
      date: normalized.date
    });
    redirect(`/stats/${encodeURIComponent(player)}?${params.toString()}`);
  }
  
  // Normalize URL parameters (now only new format)
  const normalized = normalizeUrlParams(resolvedSearchParams);
  const requestedRegion = normalized.region;
  const requestedView = normalized.view;
  const requestedGameMode = normalized.mode;

  // Use shared data fetching function
  const { channelData, chineseStreamerData, allData, currentRanks, error } = await fetchPlayerData(player);
  const normalizedChannelData = channelData.map((entry) => ({
    ...entry,
    youtube: entry.youtube ?? undefined,
  }));

  if (error || !allData || allData.length === 0) {
    return <PlayerNotFound player={player} />;
  }

  const {
    regions,
    gameModes,
    availableCombos,
    validGameMode,
    finalRegion,
    finalView,
    shouldRedirect,
  } = resolveSelection({
    allData,
    requestedRegion,
    requestedView,
    requestedGameMode,
  });

  // Only redirect if absolutely necessary
  if (shouldRedirect) {
    const params = toNewUrlParams({
      region: finalRegion,
      mode: validGameMode,
      view: finalView,
      date: normalized.date,
    });
    redirect(`/stats/${encodeURIComponent(player)}?${params.toString()}`);
  }

  const playerData: PlayerData = {
    name: player,
    data: allData,
    availableModes: {
      regions,
      gameModes,
      defaultRegion: requestedRegion,
      defaultGameMode: requestedGameMode === 'duo' ? '1' : '0',
      availableCombos
    },
    currentRanks: currentRanks || {}
  };

  return (
    <Suspense fallback={
      <div className="container mx-auto p-4">
        <DashboardCard>
          <div className="text-2xl font-bold text-center">Loading...</div>
        </DashboardCard>
      </div>
    }>
      <PlayerProfile
        player={player}
        region={requestedRegion}
        view={requestedView}
        date={normalized.date}
        playerData={playerData}
        channelData={normalizedChannelData}
        chineseStreamerData={chineseStreamerData}
      />
    </Suspense>
  );
} 
