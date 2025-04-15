import { notFound } from 'next/navigation';
import { supabase } from '@/utils/supabaseClient';
import Image from 'next/image';
import { dedupData } from '@/utils/getDedupData';
import RatingHistory from '@/components/RatingHistory';

async function getPlayerData(player: string, region: string) {
  // TODO: Replace with actual API call
  // This is mock data for now

  const { data, error } = await supabase
    .from('leaderboard_snapshots')
    .select('player_name, rating, snapshot_time, region, rank')
    .eq('player_name', player)
    .eq('region', region.toUpperCase())
    .order('snapshot_time', { ascending: true });

  if (error || !data || data.length === 0) {
    return null;
  }
  
  console.log(data);
  return {
    name: player,
    rank: data?.[0]?.rank,
    rating: data?.[0]?.rating,
    peak: data?.reduce((max, item) => Math.max(max, item.rating), 0),
    region: region,
    data: dedupData(data?.map((item) => ({
      snapshot_time: item.snapshot_time,
      rating: item.rating,
    }))),
  };
}

export default async function PlayerProfile({
  params,
}: {
  params: { player: string; region: string };
}) {
  const playerData = await getPlayerData(params.player, params.region);

  if (!playerData) {
    return (
      <div className="container mx-auto p-4 max-w-4xl">
        <div className="bg-gray-900 rounded-lg p-6">
          <div className="text-2xl font-bold text-white mb-4 text-center">No data found for {params.player} in {params.region}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 max-w-4xl">
      <div className="bg-gray-900 rounded-lg p-6">
        <div className="flex items-center gap-6 mb-8">
          <div className="relative w-24 h-24">
            <div className="w-24 h-24 rounded-full bg-gray-700 overflow-hidden">
              {/* Placeholder avatar - replace with actual avatar later */}
              <div className="w-full h-full bg-gray-600 flex items-center justify-center text-2xl text-gray-400">
                {playerData.name[0].toUpperCase()}
              </div>
            </div>
          </div>
          
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-4xl font-bold text-white">{playerData.name}</h1>
              <span className="bg-gray-800 px-3 py-1 rounded text-gray-300">
                {playerData.region.toUpperCase()}
              </span>
            </div>
            
            <div className="flex gap-8 mt-4">
              <div>
                <div className="text-gray-400 text-sm">Rank</div>
                <div className="text-2xl text-white">{playerData.rank}</div>
              </div>
              <div>
                <div className="text-gray-400 text-sm">Rating</div>
                <div className="text-2xl text-white">{playerData.rating}</div>
              </div>
              <div>
                <div className="text-gray-400 text-sm">Peak</div>
                <div className="text-2xl text-white">{playerData.peak}</div>
              </div>
            </div>
          </div>
        </div>
        <RatingHistory data={playerData.data} />
      </div>
    </div>
  );
} 