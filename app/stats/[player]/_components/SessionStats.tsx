import StatCell from '@/components/shared/StatCell';

interface Props {
  data: { rating: number }[];
  region: string;
  averagePlacement: number | null;
}

export default function SessionStats({ data, region, averagePlacement }: Props) {
  const ratings = data.map((d: { rating: number }) => d.rating);
  const games_played = ratings.length - 1;
  const net = ratings[ratings.length - 1] - ratings[0];
  const max = Math.max(...ratings);
  const showAveragePlacement = region.toLowerCase() !== 'cn' && averagePlacement !== null;

  const stats = [
    ...(showAveragePlacement
      ? [
          {
            label: 'Average Placement',
            value: isNaN(averagePlacement!) ? 'N/A' : averagePlacement,
            valueClassName: 'text-foreground',
          },
        ]
      : []),
    {
      label: 'Rating Change',
      value: net > 0 ? `+${net}` : net,
      valueClassName: net >= 0 ? 'text-emerald-500' : 'text-rose-500',
    },
    { label: 'Games Played', value: games_played, valueClassName: 'text-foreground' },
    { label: 'Starting', value: ratings[0], valueClassName: 'text-foreground' },
    { label: 'Ending', value: ratings[ratings.length - 1], valueClassName: 'text-foreground' },
    { label: 'Highest', value: max, valueClassName: 'text-emerald-500' },
  ];

  return (
    <div className="inline-block w-fit max-w-full">
      <div className="flex flex-row flex-wrap">
        {stats.map((stat) => (
          <StatCell
            key={stat.label}
            label={stat.label}
            value={stat.value}
            valueClassName={stat.valueClassName}
          />
        ))}
      </div>
    </div>
  );
}
