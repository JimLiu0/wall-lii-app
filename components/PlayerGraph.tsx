'use client';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import RatingTooltip from './ToolTip';

interface Props {
  data: { snapshot_time: string; rating: number }[];
}

export default function PlayerGraph({ data }: Props) {
  const formattedData = data.map((d, i) => ({
    date: new Date(d.snapshot_time).toLocaleDateString('en-US', {
      weekday: 'short',
      day: 'numeric',
    }),
    rating: d.rating,
    snapshot_time: d.snapshot_time,
    prevRating: i > 0 ? data[i - 1].rating : null,
  }));

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={formattedData}>
        <XAxis
          dataKey="date"
          tickFormatter={(value, index) => {
            // Only show label if the previous one is different
            return index === 0 || formattedData[index - 1].date !== value ? value : '';
          }}
          interval={0} // force it to attempt to render all ticks, then we hide dups
        />
        <YAxis
          domain={['dataMin - 50', 'dataMax + 50']}
          tickFormatter={(value) => Math.round(value).toString()}
        />
        <Tooltip content={<RatingTooltip />} />
        <Line type="monotone" dataKey="rating" stroke="#00BFFF" dot />
      </LineChart>
    </ResponsiveContainer>
  );
}