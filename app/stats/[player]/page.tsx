import { Suspense } from 'react';
import PlayerProfile from './_components/PlayerProfile';
import { Metadata } from 'next';
import { redirect } from 'next/navigation';
import PlayerNotFound from './_components/PlayerNotFound';
import StatsUnavailable from './_components/StatsUnavailable';
import { normalizeUrlParams, toNewUrlParams, hasOldFormat } from '@/utils/urlParams';
import { fetchPlayerSummary, generatePlayerMetadata, PlayerData, resolveSelection, fetchInitialHistory } from './_lib/data';
import { historyKey } from './_lib/history';
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

export const dynamic = 'force-dynamic';

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
  const normalized = normalizeUrlParams({ ...resolvedSearchParams, view: resolvedSearchParams.view ?? 'day' });
  const requestedRegion = normalized.region;
  const requestedView = normalized.view;
  const requestedGameMode = normalized.mode;

  // Use shared data fetching function
  const { playerId, channelData, chineseStreamerData, summarySnapshots, currentRanks, error } = await fetchPlayerSummary(player);
  const normalizedChannelData = channelData.map((entry) => ({
    ...entry,
    youtube: entry.youtube ?? undefined,
  }));

  if (error) {
    return <StatsUnavailable player={player} />;
  }

  if (!summarySnapshots || summarySnapshots.length === 0) {
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
    summarySnapshots,
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

  const initialSelection = {
    region: finalRegion,
    mode: validGameMode,
    view: finalView,
    date: normalized.date,
  };
  let history;
  try {
    history = await fetchInitialHistory(playerId, player, initialSelection);
  } catch (historyError) {
    console.error('Error fetching selected player history:', historyError);
    return <StatsUnavailable player={player} />;
  }

  const playerData: PlayerData = {
    name: player,
    data: history,
    playerId,
    summarySnapshots,
    initialSelection,
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
        key={`${player}-${historyKey(initialSelection)}`}
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
