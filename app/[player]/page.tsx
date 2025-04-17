import { Suspense } from 'react';
import { supabase } from '@/utils/supabaseClient';
import PlayerProfile from '@/components/PlayerProfile';
import { Metadata } from 'next';
import { redirect } from 'next/navigation';

interface PageParams {
  player: string;
}

interface SearchParams {
  r?: string;
  v?: string;
  o?: string;
  g?: string;
}

interface PageProps {
  params: Promise<PageParams>;
  searchParams: Promise<SearchParams>;
}

const regionNames = {
  na: 'North America',
  eu: 'Europe',
  ap: 'Asia Pacific',
  cn: 'China'
};

export async function generateMetadata({ params, searchParams }: { params: Promise<PageParams>, searchParams: Promise<SearchParams> }): Promise<Metadata> {
  const [resolvedParams, resolvedSearchParams] = await Promise.all([params, searchParams]);
  const decodedPlayer = decodeURIComponent(resolvedParams.player);
  const region = resolvedSearchParams.r || 'all';
  const regionName = regionNames[region as keyof typeof regionNames] || region.toUpperCase();

  return {
    title: `${decodedPlayer} | ${regionName} Player Profile | Wall-lii`,
    description: `View ${decodedPlayer}'s player profile and statistics for the ${regionName} region in Wall-lii`,
  };
}

interface PlayerModes {
  regions: string[];
  gameModes: string[];
  defaultRegion: string;
  defaultGameMode: string;
  availableCombos: string[]; // e.g. ['na-0', 'na-1', 'cn-0']
}

interface PlayerData {
  name: string;
  rank: number;
  rating: number;
  peak: number;
  region: string;
  data: { snapshot_time: string; rating: number }[];
  availableModes: PlayerModes;
}

function determineDefaultView(data: { snapshot_time: string; rating: number }[]) {
  const now = new Date();
  const laMidnightToday = new Date(
    now.toLocaleString('en-US', { timeZone: 'America/Los_Angeles' })
  );
  laMidnightToday.setHours(0, 0, 0, 0);

  const startOfWeek = new Date(laMidnightToday);
  startOfWeek.setDate(startOfWeek.getDate() - ((startOfWeek.getDay() + 6) % 7)); // Monday

  const ratingsToday = new Set(
    data
      .filter(item => new Date(item.snapshot_time) >= laMidnightToday)
      .map(item => item.rating)
  );

  const ratingsThisWeek = new Set(
    data
      .filter(item => new Date(item.snapshot_time) >= startOfWeek)
      .map(item => item.rating)
  );

  if (ratingsToday.size > 1) {
    return 'd';
  } else if (ratingsThisWeek.size > 1) {
    return 'w';
  } else {
    return 's';
  }
}

export default async function PlayerPage({
  params,
  searchParams,
}: PageProps) {
  const [resolvedParams, resolvedSearchParams] = await Promise.all([
    params,
    searchParams
  ]);

  const player = decodeURIComponent(resolvedParams.player);
  const requestedRegion = resolvedSearchParams.r || 'all';
  const requestedView = resolvedSearchParams.v;
  const requestedOffset = parseInt(resolvedSearchParams.o || '0', 10);
  const requestedGameMode = resolvedSearchParams.g || 's';

  // Fetch all data for the player across all regions and game modes
  const { data, error } = await supabase
    .from('leaderboard_snapshots')
    .select('player_name, rating, snapshot_time, region, rank, game_mode')
    .eq('player_name', player)
    .order('snapshot_time', { ascending: true });

  if (error || !data || data.length === 0) {
    return (
      <div className="container mx-auto p-4 max-w-4xl">
        <div className="bg-gray-900 rounded-lg p-6">
          <div className="text-2xl font-bold text-white mb-4 text-center">
            No data found for {player}
          </div>
        </div>
      </div>
    );
  }

  // Get unique regions and game modes for this player
  const regions = [...new Set(data.map(item => item.region.toLowerCase()))];
  const gameModes = [...new Set(data.map(item => item.game_mode))];
  
  // Create all possible combinations that exist in the data
  const availableCombos = data.reduce((acc, item) => {
    const combo = `${item.region.toLowerCase()}-${item.game_mode}`;
    if (!acc.includes(combo)) {
      acc.push(combo);
    }
    return acc;
  }, [] as string[]);

  // Find the most recent valid combination if requested one doesn't exist
  const requestedCombo = `${requestedRegion}-${requestedGameMode === 'd' ? '1' : '0'}`;
  if (!availableCombos.includes(requestedCombo) || !requestedView) {
    // Find the most recent snapshot
    const mostRecent = data.reduce((latest, current) => {
      const currentTime = new Date(current.snapshot_time).getTime();
      const latestTime = new Date(latest.snapshot_time).getTime();
      return currentTime > latestTime ? current : latest;
    });

    const defaultRegion = mostRecent.region.toLowerCase();
    const defaultGameMode = mostRecent.game_mode;
    const defaultView = determineDefaultView(data.filter(
      item => item.region.toLowerCase() === defaultRegion && item.game_mode === defaultGameMode
    ));

    // Redirect with all the determined defaults
    const params = new URLSearchParams({
      r: defaultRegion,
      g: defaultGameMode === '1' ? 'd' : 's',
      v: defaultView,
      o: '0'
    });
    redirect(`/${player}?${params.toString()}`);
  }

  // Filter data for the current region and game mode
  const filteredData = data.filter(
    item =>
      item.region.toLowerCase() === requestedRegion &&
      item.game_mode === (requestedGameMode === 'd' ? '1' : '0')
  );

  const playerData: PlayerData = {
    name: player,
    rank: filteredData[filteredData.length - 1]?.rank,
    rating: filteredData[filteredData.length - 1]?.rating,
    peak: filteredData.reduce((max, item) => Math.max(max, item.rating), 0),
    region: requestedRegion,
    data: filteredData.map((item) => ({
      snapshot_time: item.snapshot_time,
      rating: item.rating,
    })),
    availableModes: {
      regions,
      gameModes,
      defaultRegion: requestedRegion,
      defaultGameMode: requestedGameMode === 'd' ? '1' : '0',
      availableCombos
    }
  };

  return (
    <Suspense fallback={
      <div className="container mx-auto p-4">
        <div className="bg-gray-900 rounded-lg p-6">
          <div className="text-2xl font-bold text-white mb-4 text-center">Loading...</div>
        </div>
      </div>
    }>
      <PlayerProfile
        player={player}
        region={requestedRegion}
        view={requestedView}
        offset={requestedOffset}
        playerData={playerData}
      />
    </Suspense>
  );
} 