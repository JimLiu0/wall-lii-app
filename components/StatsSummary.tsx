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
      <div>📈 Rating Change: {net > 0 ? `+${net}` : net}</div>
      <div>🏔️ Highest Rating: {max}</div>
      <div>🏞️ Lowest Rating: {min}</div>
    </div>
  );
}