'use client';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import RatingTooltip from './ToolTip';
import { DateTime } from 'luxon';
import { dedupData } from '@/utils/getDedupData';

interface Props {
  data: { snapshot_time: string; rating: number }[];
  playerName: string;
}

export default function PlayerGraph({ data, playerName }: Props) {
  data = dedupData(data);
  // Check if all ratings are the same
  const allSameRating = data.every(d => d.rating === data[0].rating);
  
  if (allSameRating) {
    // Find the earliest timestamp with this rating
    const earliestEntry = data.reduce((earliest, current) => {
      return DateTime.fromISO(current.snapshot_time) < DateTime.fromISO(earliest.snapshot_time) 
        ? current 
        : earliest;
    }, data[0]);

    const formattedDate = DateTime.fromISO(earliestEntry.snapshot_time).toLocaleString({
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      timeZoneName: 'short'
    });

    return (
      <div className="flex items-center justify-center h-full text-gray-300 text-center px-4">
        {playerName} didn&apos;t play any games during this period but they achieved rating {earliestEntry.rating} on {formattedDate}
      </div>
    );
  }

  const uniqueDatesLength = (new Set(data.map((d) => new Date(d.snapshot_time).toLocaleDateString('en-US', { month: 'numeric', day: 'numeric'}) ))).size;

  const formattedData = data.map((d, i) => ({
    date: uniqueDatesLength <= 8 ? new Date(d.snapshot_time).toLocaleDateString('en-US', {
      weekday: 'short'
    }) : new Date(d.snapshot_time).toLocaleDateString('en-US', {
      month: 'numeric',
      day: 'numeric',
    }),
    rating: d.rating,
    snapshot_time: d.snapshot_time,
    prevRating: i > 0 ? data[i - 1].rating : null,
  }));

  const tickInterval = Math.ceil(formattedData.length / 10); // Show ~10 ticks max

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={formattedData}>
        <XAxis
          dataKey="date"
          tickFormatter={(value, index) => {
            // Only show label if the previous one is different
            if (uniqueDatesLength <= 8) {
              return (index > 0) && formattedData[index - 1].date !== value ? value : '';
            } else {
              return index === 0 || formattedData[index - 1].date !== value ? value : '';
            }
          }}
          interval={uniqueDatesLength <= 8 ? 0 : tickInterval} // force it to attempt to render all ticks, then we hide dups
        />
        <YAxis
          domain={['dataMin', 'dataMax']}
          tickFormatter={(value) => Math.round(value).toString()}
        />
        <Tooltip content={<RatingTooltip />} />
        <Line type="monotone" dataKey="rating" stroke="#00BFFF" dot />
      </LineChart>
    </ResponsiveContainer>
  );
}