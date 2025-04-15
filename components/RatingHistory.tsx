'use client';

import { useState } from 'react';
import PlayerGraph from '@/components/PlayerGraph';
import { DateTime } from 'luxon';
type TimeRange = 'all' | 'week' | 'today';

interface Props {
  data: { snapshot_time: string; rating: number }[];
}

export default function RatingHistory({ data }: Props) {
  const [timeRange, setTimeRange] = useState<TimeRange>('all');

  const filterData = () => {
    const now = DateTime.now(); // User's local time zone
    const startOfDay = now
      .minus({ days: 0 })
      .startOf('day')
      .toUTC();
    const startOfWeek = now
      .minus({ weeks: 0 })
      .startOf('week')
      .startOf('day')
      .toUTC();

    switch (timeRange) {
      case 'today':
        return data.filter(item => new Date(item.snapshot_time) >= startOfDay);
      case 'week':
        return data.filter(item => new Date(item.snapshot_time) >= startOfWeek);
      default:
        return data;
    }
  };

  const timeRangeOptions: { value: TimeRange; label: string }[] = [
    { value: 'all', label: 'All Time' },
    { value: 'week', label: 'This Week' },
    { value: 'today', label: 'Today' },
  ];

  return (
    <>
      <div className="flex justify-center gap-2 mb-4">
        {timeRangeOptions.map((option) => (
          <button
            key={option.value}
            onClick={() => setTimeRange(option.value)}
            className={`px-4 py-2 rounded ${
              timeRange === option.value
                ? 'bg-blue-500 text-white'
                : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>
      <div className="h-[300px] w-full">
        <PlayerGraph data={filterData()} />
      </div>
    </>
  );
} 