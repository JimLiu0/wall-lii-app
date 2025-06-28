'use client';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Label } from 'recharts';
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

  // Determine if the first two snapshots span different days
  const twoDaysOnlyAndDifferent = uniqueDatesLength <= 2 && data.length >= 2 &&
    new Date(data[0].snapshot_time).toDateString() !== new Date(data[1].snapshot_time).toDateString();

  // Determine view mode for labeling
  const viewMode: 'hour' | 'weekday' | 'monthDay' = twoDaysOnlyAndDifferent
    ? 'hour'
    : uniqueDatesLength <= 8
      ? 'weekday'
      : 'monthDay';

  const formattedData = data.map((d, i) => {
    const dt = new Date(d.snapshot_time);
    let dateLabel: string;

    switch (viewMode) {
      case 'hour':
        dateLabel = dt.toLocaleTimeString('en-US', {
          hour12: false,
          hour: '2-digit',
          minute: '2-digit',
        });
        break;
      case 'weekday':
        dateLabel = dt.toLocaleDateString('en-US', {
          weekday: 'short',
        });
        break;
      default: // monthDay
        dateLabel = dt.toLocaleDateString('en-US', {
          month: 'numeric',
          day: 'numeric',
        });
    }

    return {
      date: dateLabel,
      rating: d.rating,
      snapshot_time: d.snapshot_time,
      prevRating: i > 0 ? data[i - 1].rating : null,
    };
  });

  const tickInterval = Math.ceil(formattedData.length / 10); // Show ~10 ticks max

  // Determine X-axis label based on the span
  const axisLabel = viewMode === 'hour'
    ? 'Time (HH)'
    : ''

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart
        data={formattedData}
      >
        <XAxis
          dataKey="date"
          tickFormatter={(value, index) => {
            if (viewMode === 'hour') {
              return (index > 0 && formattedData[index - 1].date !== value) ? value : '';
            } else if (viewMode === 'weekday') {
              return (index > 0 && formattedData[index - 1].date !== value) ? value : '';
            } else {
              return (index === 0 || formattedData[index - 1].date !== value) ? value : '';
            }
          }}
          interval={viewMode === 'weekday' ? 0 : tickInterval}
        >
          <Label value={axisLabel} position="insideBottom" dy={10} />
        </XAxis>
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