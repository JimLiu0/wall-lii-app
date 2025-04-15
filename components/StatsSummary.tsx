interface Props {
  data: { rating: number }[];
}

export default function StatsSummary({ data }: Props) {
  const ratings = data.map((d) => d.rating);
  const games_played = ratings.length - 1;
  const net = ratings[ratings.length - 1] - ratings[0];
  const max = Math.max(...ratings);
  const min = Math.min(...ratings);

  return (
    <div className="space-y-2">
      <div>🎮 Games Played: {games_played}</div>
      <div>{net >= 0 ? '📈' : '📉'} Rating Change: <span className={net >= 0 ? "text-green-500" : "text-red-500"}>{net > 0 ? `+${net}` : net}</span></div>
      <div>🏔️ Highest Rating: <span className="text-green-500">{max}</span></div>
      <div>🏞️ Lowest Rating: <span className="text-red-500">{min}</span></div>
    </div>
  );
}