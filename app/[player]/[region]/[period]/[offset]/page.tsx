'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { supabase } from '@/utils/supabaseClient';
import { dedupData } from '@/utils/getDedupData';
import PlayerGraph from '@/components/PlayerGraph';
import StatsSummary from '@/components/StatsSummary';
import { useEffect, useState } from 'react';
import getPeriodLabel from '@/utils/getPeriodLabel';
import { DateTime } from 'luxon';
type TimeView = 'all' | 'week' | 'day';

interface PlayerData {
  name: string;
  rank: number;
  rating: number;
  peak: number;
  region: string;
  data: { snapshot_time: string; rating: number }[];
}

async function getPlayerData(player: string, region: string, view: TimeView = 'all', offset: number = 0) {
  // const now = new Date();
  // const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  // const weekAgo = new Date(today);
  // weekAgo.setDate(weekAgo.getDate() - 7 * (offset + 1));
  // const dayAgo = new Date(today);
  // dayAgo.setDate(dayAgo.getDate() - (offset + 1));

  let query = supabase
    .from('leaderboard_snapshots')
    .select('player_name, rating, snapshot_time, region, rank')
    .eq('player_name', player)
    .eq('region', region.toUpperCase())
    .order('snapshot_time', { ascending: true });

  // Add time range filters based on view
  // Add time range filters based on view
  const now = DateTime.now(); // User's local time zone
  if (view === 'week') {
    const startOfWeek = now
      .minus({ weeks: offset })
      .startOf('week')
      .startOf('day');
    query = query.gte('snapshot_time', startOfWeek.toISO());
  } else if (view === 'day') {
    const startOfDay = now
      .minus({ days: offset })
      .startOf('day');
    query = query.gte('snapshot_time', startOfDay.toISO());
  }

  const { data, error } = await query;

  if (error || !data || data.length === 0) {
    return null;
  }

  return {
    name: player,
    rank: data[data.length - 1]?.rank,
    rating: data[data.length - 1]?.rating,
    peak: data.reduce((max, item) => Math.max(max, item.rating), 0),
    region: region,
    data: dedupData(data.map((item) => ({
      snapshot_time: item.snapshot_time,
      rating: item.rating,
    }))),
  };
}

export default function PlayerProfile({
  params,
}: {
  params: { player: string; region: string; period: string; offset: string };
}) {
  const router = useRouter();

  const period = params.period || 's'; // default to season
  const view: TimeView =
    period === 'w' ? 'week' : period === 'd' ? 'day' : 'all';
  const offset = parseInt(params.offset || '0', 10) || 0;

  const [playerData, setPlayerData] = useState<PlayerData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const data = await getPlayerData(params.player, params.region, view, offset);
      setPlayerData(data);
      setLoading(false);
    };
    fetchData();
  }, [params.player, params.region, view, offset]);

  if (loading) {
    return (
      <div className="container mx-auto p-4 max-w-4xl">
        <div className="bg-gray-900 rounded-lg p-6">
          <div className="text-2xl font-bold text-white mb-4 text-center">Loading...</div>
        </div>
      </div>
    );
  }

  if (!playerData) {
    return (
      <div className="container mx-auto p-4 max-w-4xl">
        <div className="bg-gray-900 rounded-lg p-6">
          <div className="text-2xl font-bold text-white mb-4 text-center">No data found for {params.player} in {params.region}</div>
        </div>
      </div>
    );
  }

  const updateView = (newView: TimeView) => {
    const periodMap = { all: 's', week: 'w', day: 'd' };
    const newPeriod = periodMap[newView];
    router.push(`/${params.player}/${params.region}/${newPeriod}/0`);
  };
  
  const updateOffset = (newOffset: number) => {
    router.push(`/${params.player}/${params.region}/${period}/${newOffset}`);
  };

  return (
    <div className="container mx-auto p-4 max-w-4xl">
      <div className="bg-gray-900 rounded-lg p-6">
        <div className="flex items-center gap-6 mb-8">
          <div className="relative w-24 h-24">
            <div className="w-24 h-24 rounded-full bg-gray-700 overflow-hidden">
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

        <div className="flex flex-col md:flex-row gap-6">
          <div className="w-full md:w-2/3">
            <div className="mb-6">
              <div className="mb-4">
                {view !== 'all' && (
                  <div className="mt-4 flex items-center gap-3 text-white">
                    <button
                      onClick={() => updateOffset(offset + 1)}
                      className="hover:text-blue-500"
                    >
                      ←
                    </button>
                    <button
                      disabled={offset === 0}
                      className={`hover:text-blue-500 ${offset === 0 ? 'text-gray-500 cursor-not-allowed' : ''}`}
                      onClick={() => updateOffset(0)}
                    >
                      Today
                    </button>
                    <button
                      disabled={offset === 0}
                      className={`hover:text-blue-500 ${offset === 0 ? 'text-gray-500 cursor-not-allowed' : ''}`}
                      onClick={() => updateOffset(offset - 1)}
                    >
                      →
                    </button>
                  </div>
                )}
              </div>
              <div className="flex justify-between items-center mb-4">
                <div className="flex gap-2">
                  {[
                    { value: 'all' as const, label: 'Season' },
                    { value: 'week' as const, label: 'Week' },
                    { value: 'day' as const, label: 'Day' },
                  ].map((option) => (
                    <button
                      key={option.value}
                      onClick={() => updateView(option.value)}
                      className={`px-4 py-2 rounded ${view === option.value
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                        }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="text-xl font-bold text-white mb-4">
                {view === 'all' ? 'Season Rating Record' :
                  `${view === 'week' ? 'Weekly' : 'Daily'} Record - ${getPeriodLabel(view, offset)}`}
              </div>
            </div>

            <div className="h-[300px] w-full">
              <PlayerGraph data={playerData.data} />
            </div>
          </div>

          {(
            <div className="w-full md:w-1/3">
              <StatsSummary data={playerData.data} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 