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
  const requestedView = resolvedSearchParams.v || 's';
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
  const availableModes: PlayerModes = {
    regions: [...new Set(data.map(item => item.region.toLowerCase()))],
    gameModes: [...new Set(data.map(item => item.game_mode))],
    defaultRegion: requestedRegion,
    defaultGameMode: requestedGameMode === 'd' ? '1' : '0'
  };

  // If the requested region/mode combination doesn't exist, find the most recent valid combination
  const hasRequestedCombination = data.some(
    item => 
      item.region.toLowerCase() === requestedRegion && 
      item.game_mode === (requestedGameMode === 'd' ? '1' : '0')
  );

  if (!hasRequestedCombination) {
    // Group snapshots by rating and game_mode
    const ratingGroups = data.reduce((acc, item) => {
      const key = `${item.rating}-${item.game_mode}`;
      if (!acc[key]) {
        acc[key] = [];
      }
      acc[key].push(item);
      return acc;
    }, {} as Record<string, typeof data>);

    // For each rating group, find the oldest snapshot
    const oldestSnapshots = Object.entries(ratingGroups).map(([key, items]) => {
      // Sort by snapshot_time ascending to get the oldest
      const sortedItems = items.sort((a, b) => 
        new Date(a.snapshot_time).getTime() - new Date(b.snapshot_time).getTime()
      );
      return {
        key,
        item: sortedItems[0],
        time: new Date(sortedItems[0].snapshot_time).getTime()
      };
    });

    // Sort by oldest snapshot time
    const sortedByOldest = oldestSnapshots.sort((a, b) => a.time - b.time);

    if (sortedByOldest.length > 0) {
      const oldestSnapshot = sortedByOldest[0].item;
      availableModes.defaultRegion = oldestSnapshot.region.toLowerCase();
      availableModes.defaultGameMode = oldestSnapshot.game_mode;

      // Redirect to the correct URL with the default region and game mode
      const params = new URLSearchParams({
        r: availableModes.defaultRegion,
        g: availableModes.defaultGameMode === '1' ? 'd' : 's',
        v: requestedView,
        o: requestedOffset.toString()
      });
      redirect(`/${player}?${params.toString()}`);
    }
  }

  // Filter data for the current region and game mode
  const filteredData = data.filter(
    item => 
      item.region.toLowerCase() === availableModes.defaultRegion && 
      item.game_mode === availableModes.defaultGameMode
  );

  const playerData: PlayerData = {
    name: player,
    rank: filteredData[filteredData.length - 1]?.rank,
    rating: filteredData[filteredData.length - 1]?.rating,
    peak: filteredData.reduce((max, item) => Math.max(max, item.rating), 0),
    region: availableModes.defaultRegion,
    data: filteredData.map((item) => ({
      snapshot_time: item.snapshot_time,
      rating: item.rating,
    })),
    availableModes
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
        region={availableModes.defaultRegion}
        view={requestedView}
        offset={requestedOffset}
        playerData={playerData}
      />
    </Suspense>
  );
} 