'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { supabase } from '@/utils/supabaseClient';
import { dedupData } from '@/utils/getDedupData';
import PlayerGraph from '@/components/PlayerGraph';
import StatsSummary from '@/components/StatsSummary';
import getPeriodLabel from '@/utils/getPeriodLabel';
import { DateTime } from 'luxon';
import Link from 'next/link';

type TimeView = 'all' | 'week' | 'day';

interface PlayerData {
  name: string;
  rank: number;
  rating: number;
  peak: number;
  region: string;
  data: { snapshot_time: string; rating: number }[];
}

interface Props {
  player: string;
  region: string;
  period: string;
  offset: string;
}

export default function PlayerProfile({ player, region, period, offset }: Props) {
  const router = useRouter();
  const view: TimeView = period === 'w' ? 'week' : period === 'd' ? 'day' : 'all';
  const offsetNum = parseInt(offset || '0', 10) || 0;

  const [playerData, setPlayerData] = useState<PlayerData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      let query = supabase
        .from('leaderboard_snapshots')
        .select('player_name, rating, snapshot_time, region, rank')
        .eq('player_name', player)
        .eq('region', region.toUpperCase())
        .order('snapshot_time', { ascending: true });

      const now = DateTime.now();

      if (view === 'week') {
        const startOfWeek = now.minus({ weeks: offsetNum }).startOf('week').startOf('day');
        query = query
          .gte('snapshot_time', startOfWeek.toISO())
          .lte('snapshot_time', startOfWeek.plus({ weeks: 1 }).toISO());
      } else if (view === 'day') {
        const startOfDay = now.minus({ days: offsetNum }).startOf('day');
        query = query
          .gte('snapshot_time', startOfDay.toISO())
          .lte('snapshot_time', startOfDay.plus({ days: 1 }).toISO());
      }

      const { data, error } = await query;
      if (error || !data || data.length === 0) {
        setPlayerData(null);
        setLoading(false);
        return;
      }

      setPlayerData({
        name: player,
        rank: data[data.length - 1]?.rank,
        rating: data[data.length - 1]?.rating,
        peak: data.reduce((max, item) => Math.max(max, item.rating), 0),
        region,
        data: dedupData(data.map((item) => ({
          snapshot_time: item.snapshot_time,
          rating: item.rating,
        }))),
      });
      setLoading(false);
    };

    fetchData();
  }, [player, region, view, offsetNum]);

  const updateView = (newView: TimeView) => {
    const periodMap = { all: 's', week: 'w', day: 'd' };
    router.push(`/${player}/${region}/${periodMap[newView]}/0`);
  };

  const updateOffset = (newOffset: number) => {
    router.push(`/${player}/${region}/${period}/${newOffset}`);
  };

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
          <div className="text-2xl font-bold text-white mb-4 text-center">
            No data found for {player} in {region}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4">
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
              <Link href={`/lb/${playerData.region.toLowerCase()}`} className="bg-gray-800 px-3 py-1 rounded text-gray-300 hover:bg-gray-700">
                {playerData.region.toUpperCase()}
              </Link>
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
              {view !== 'all' && (
                <div className="mt-4 flex items-center gap-3 text-white">
                  <button onClick={() => updateOffset(offsetNum + 1)} className="hover:text-blue-500">←</button>
                  <button
                    disabled={offsetNum === 0}
                    className={`hover:text-blue-500 ${offsetNum === 0 ? 'text-gray-500 cursor-not-allowed' : ''}`}
                    onClick={() => updateOffset(0)}
                  >
                    Today
                  </button>
                  <button
                    disabled={offsetNum === 0}
                    className={`hover:text-blue-500 ${offsetNum === 0 ? 'text-gray-500 cursor-not-allowed' : ''}`}
                    onClick={() => updateOffset(offsetNum - 1)}
                  >
                    →
                  </button>
                </div>
              )}
              <div className="flex gap-2 mt-4">
                {['all', 'week', 'day'].map((value) => (
                  <button
                    key={value}
                    onClick={() => updateView(value as TimeView)}
                    className={`px-4 py-2 rounded ${view === value
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                      }`}
                  >
                    {value === 'all' ? 'Season' : value.charAt(0).toUpperCase() + value.slice(1)}
                  </button>
                ))}
              </div>

              <div className="text-xl font-bold text-white mt-4">
                {view === 'all'
                  ? 'Season Rating Record'
                  : `${view === 'week' ? 'Weekly' : 'Daily'} Record - ${getPeriodLabel(view, offsetNum)}`}
              </div>
            </div>

            <div className="h-[300px] w-full">
              <PlayerGraph data={playerData.data} />
            </div>
          </div>

          <div className="w-full md:w-1/3 flex justify-center items-center">
            <StatsSummary data={playerData.data} />
          </div>
        </div>
      </div>
    </div>
  );
}