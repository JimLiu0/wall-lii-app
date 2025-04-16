import { Suspense } from 'react';
import { supabase } from '@/utils/supabaseClient';
import PlayerProfile from '@/components/PlayerProfile';
import { Metadata } from 'next';

interface PageParams {
  player: string;
  region: string;
}

interface SearchParams {
  v?: string;
  o?: string;
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

export async function generateMetadata({ params }: { params: Promise<PageParams> }): Promise<Metadata> {
  const resolvedParams = await params;
  const decodedPlayer = decodeURIComponent(resolvedParams.player);
  const regionName = regionNames[resolvedParams.region as keyof typeof regionNames] || resolvedParams.region.toUpperCase();
  
  return {
    title: `${decodedPlayer} | ${regionName} Player Profile | Wall-lii`,
    description: `View ${decodedPlayer}'s player profile and statistics for the ${regionName} region in Wall-lii`,
  };
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
}: PageProps) {
  const [resolvedParams, resolvedSearchParams] = await Promise.all([
    params,
    searchParams
  ]);
  
  const { region } = resolvedParams;
  const player = decodeURIComponent(resolvedParams.player);
  const view = resolvedSearchParams.v || 's';
  const offset = parseInt(resolvedSearchParams.o || '0', 10);

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