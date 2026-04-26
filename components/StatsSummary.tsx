interface Props {
  data: { rating: number }[];
  region: string;
  averagePlacement: number | null;
}

export default function StatsSummary({ data, region, averagePlacement }: Props) {
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

  const wideColsClass = stats.length === 7 ? 'xl:grid-cols-7' : 'xl:grid-cols-6';

  return (
    <div className="rounded-lg border border-border/50 bg-card/40">
      <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 ${wideColsClass}`}>
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="flex min-h-14 flex-col justify-center rounded-md border border-border/50 bg-background/30 px-3 py-2"
          >
            <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              {stat.label}
            </span>
            <span className={`text-sm font-semibold leading-tight break-words ${stat.valueClassName}`}>
              {stat.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}