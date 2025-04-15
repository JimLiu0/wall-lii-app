'use client';

import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { fetchDailySnapshots, fetchWeeklySnapshots } from '@/utils/getPlayerStats';
import PlayerGraph from '@/components/PlayerGraph';
import StatsSummary from '@/components/StatsSummary';
import getPeriodLabel from '@/utils/getPeriodLabel';
export default function PlayerPage() {
  const { player, region, period, offset } = useParams();
  const offsetInt = Number(offset ?? 0); // fallback to 0 if not present
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (
      typeof player === 'string' &&
      typeof region === 'string' &&
      typeof period === 'string' &&
      !Number.isNaN(offsetInt)
    ) {
      const fetchData = async () => {
        let res: any[] = [];
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
  }, [player, region, period]);

  if (loading) return <div className="text-white p-4">Loading stats...</div>;
  if (!data.length) return <div className="text-white p-4">No data found for {player} in {region}.</div>;

  return (
    <div className="flex flex-col md:flex-row gap-6 p-6 text-white">
      <div className="w-full md:w-2/3">
        <div className="text-2xl font-bold text-white mb-4 text-center">
          {`${String(player).toUpperCase()}'s ${period === 'week' ? 'Weekly' : 'Daily'} Record – ${getPeriodLabel(period, offsetInt)}`}
        </div>
        <PlayerGraph data={data} />
      </div>
      <div className="w-full md:w-1/3">
        <StatsSummary data={data} />
      </div>
    </div>
  );
}