'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { fetchDailySnapshots, fetchWeeklySnapshots } from '@/utils/getPlayerStats';
import PlayerGraph from '@/components/PlayerGraph';
import StatsSummary from '@/components/StatsSummary';
import getPeriodLabel from '@/utils/getPeriodLabel';

interface Snapshot {
  player_name: string;
  rating: number;
  snapshot_time: string;
  region: string;
}
export default function PlayerPage() {
  const router = useRouter();
  const { player, region, period, offset } = useParams();
  const periodOptions = ['day', 'week'];
  const offsetInt = Number(offset ?? 0); // fallback to 0 if not present
  const [data, setData] = useState<Snapshot[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (
      typeof player === 'string' &&
      typeof region === 'string' &&
      typeof period === 'string' &&
      !Number.isNaN(offsetInt)
    ) {
      const fetchData = async () => {
        let res: Snapshot[] = [];
        if (period === 'week') {
          res = await fetchWeeklySnapshots(player, region, offsetInt);
        } else if (period === 'day') {
          res = await fetchDailySnapshots(player, region, offsetInt);
        }
        setData(res);
        setLoading(false);
      };
      fetchData();
    }
  }, [player, region, period, offsetInt]);

  if (loading) return <div className="text-white p-4">Loading stats...</div>;
  if (!data.length) return <div className="text-white p-4">No data found for {player} in {region}.</div>;

  return (
    <div className="flex flex-col items-center max-w-6xl mx-auto p-6">
      <div className="flex flex-col md:flex-row gap-6 w-full text-white">
        <div className="w-full md:w-2/3">
          <div className="text-2xl font-bold text-white mb-4 text-center">
            {`${String(player).toUpperCase()}'s ${period === 'week' ? 'Weekly' : 'Daily'} Record – ${getPeriodLabel(String(period), offsetInt)}`}
          </div>
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-6">
            {/* View toggle */}
            <div className="flex gap-2">
              {periodOptions.map((p) => (
                <button
                  key={p}
                  className={`px-3 py-1 rounded ${p === period ? 'bg-white text-black' : 'bg-gray-700 text-white'}`}
                  onClick={() => router.push(`/${player}/${region}/${p}/${offsetInt}`)}
                >
                  {p.charAt(0).toUpperCase() + p.slice(1)}
                </button>
              ))}
            </div>

            {/* Offset nav */}
            <div className="flex items-center gap-3 text-white">
              <button
                onClick={() => router.push(`/${player}/${region}/${period}/${offsetInt + 1}`)}
              >
                ← Previous
              </button>
              <button
                disabled={offsetInt === 0}
                className={offsetInt === 0 ? 'text-gray-500 cursor-not-allowed' : ''}
                onClick={() => router.push(`/${player}/${region}/${period}/0`)}
              >
                Today
              </button>
              <button
                disabled={offsetInt === 0}
                className={offsetInt === 0 ? 'text-gray-500 cursor-not-allowed' : ''}
                onClick={() => router.push(`/${player}/${region}/${period}/${offsetInt - 1}`)}
              >
                Next →
              </button>
            </div>
          </div>
          <PlayerGraph data={data} />
        </div>
        <div className="w-full md:w-1/3 flex justify-center">
          <StatsSummary data={data} />
        </div>
      </div>
    </div>
  );
}