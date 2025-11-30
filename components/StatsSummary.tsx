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
  const min = Math.min(...ratings);

  return (
    <div className="bg-gray-900 p-6 rounded-lg shadow-lg space-y-4 w-fit text-left">
      <div className="text-2xl font-bold text-white">📊 Session Stats</div>

      { region.toLowerCase() !== 'cn' && averagePlacement !== null && 
        <div className="flex justify-between text-lg">
          <span className="text-white pr-4">Average Placement</span>
          <span className="font-bold text-white">
            {isNaN(averagePlacement) ? 'N/A' : averagePlacement}
          </span>
        </div> }
  
      <div className="flex justify-between text-lg">
        <span className="text-white pr-4">🎮 Games Played</span>
        <span className="font-bold text-white">{games_played}</span>
      </div>
  
      <div className="flex justify-between text-lg">
        <span className="text-white pr-4">🔄 Rating Change</span>
        <span className={`font-bold ${net >= 0 ? 'text-green-400' : 'text-red-400'}`}>
          {net > 0 ? `+${net}` : net}
        </span>
      </div>
      
      <div className="flex justify-between text-lg">
        <span className="text-white pr-4">🌱 Starting Rating</span>
        <span className="font-bold">{ratings[0]}</span>
      </div>

      <div className="flex justify-between text-lg">
        <span className="text-white pr-4">🌿 Ending Rating</span>
        <span className="font-bold">{ratings[ratings.length - 1]}</span>
      </div>
  
      <div className="flex justify-between text-lg">
        <span className="text-white pr-4">🔥 Highest Rating</span>
        <span className="font-bold text-green-300">{max}</span>
      </div>
  
      <div className="flex justify-between text-lg">
        <span className="text-white pr-4">💩 Lowest Rating</span>
        <span className="font-bold text-red-300">{min}</span>
      </div>
    </div>
  );
}