import { Suspense } from 'react';
import { supabase } from '@/utils/supabaseClient';
import PlayerProfile from '@/components/PlayerProfile';

interface PageParams {
  player: string;
  region: string;
}

interface PlayerData {
  name: string;
  rank: number;
  rating: number;
  peak: number;
  region: string;
  data: { snapshot_time: string; rating: number }[];
}

export default async function PlayerPage({
  params,
  searchParams,
}: {
  params: PageParams;
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  const { player, region } = params;
  const view = (searchParams.v as string) || 's';
  const offset = parseInt((searchParams.o as string) || '0', 10);

  // Fetch all data for the player
  const { data, error } = await supabase
    .from('leaderboard_snapshots')
    .select('player_name, rating, snapshot_time, region, rank')
    .eq('player_name', player)
    .eq('region', region.toUpperCase())
    .order('snapshot_time', { ascending: true });

  if (error || !data || data.length === 0) {
    return (
      <div className="container mx-auto p-4 max-w-4xl">
        <div className="bg-gray-900 rounded-lg p-6">
          <div className="text-2xl font-bold text-white mb-4 text-center">
            No data found for {player} in {region}
          </div>
        </div>
      </div>
    );
  }

  const playerData: PlayerData = {
    name: player,
    rank: data[data.length - 1]?.rank,
    rating: data[data.length - 1]?.rating,
    peak: data.reduce((max, item) => Math.max(max, item.rating), 0),
    region,
    data: data.map((item) => ({
      snapshot_time: item.snapshot_time,
      rating: item.rating,
    })),
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
        region={region}
        view={view}
        offset={offset}
        playerData={playerData}
      />
    </Suspense>
  );
}