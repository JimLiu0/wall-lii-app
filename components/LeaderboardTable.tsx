import Link from 'next/link';
import SocialIndicators from './SocialIndicators';
import React from 'react';

interface LeaderboardEntry {
  player_name: string;
  rating: number;
  rank: number;
  region: string;
  games_played?: number;
  rating_delta?: number;
  rank_delta?: number;
  game_mode?: string;
}

interface ChannelEntry {
  channel: string;
  player: string;
  live: boolean;
  youtube?: string;
}

interface LeaderboardTableProps {
  data: LeaderboardEntry[];
  channelData: ChannelEntry[];
  loading?: boolean;
  showDeltas?: boolean;
  showGames?: boolean;
  showMode?: boolean;
  showRegion?: boolean;
  colClassName?: string;
}

export default function LeaderboardTable({
  data,
  channelData,
  loading = false,
  showDeltas = true,
  showGames = true,
  showMode = false,
  showRegion = false,
  colClassName = '',
}: LeaderboardTableProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="text-sm font-medium text-zinc-400 border-b border-gray-800">
            <th className={`px-4 py-2 text-left ${colClassName}`}>Rank</th>
            {showDeltas && <th className={`px-4 py-2 text-left ${colClassName}`}>ΔRank</th>}
            <th className={`px-4 py-2 text-left ${colClassName}`}>Player</th>
            <th className={`px-4 py-2 text-left ${colClassName}`}>Rating</th>
            {showDeltas && <th className={`px-4 py-2 text-left ${colClassName}`}>ΔRating</th>}
            {showGames && <th className={`px-4 py-2 text-left ${colClassName}`}>Games</th>}
            {showMode && <th className={`px-4 py-2 text-left ${colClassName}`}>Mode</th>}
            {showRegion && <th className={`px-4 py-2 text-left ${colClassName}`}>Region</th>}
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr><td colSpan={8} className="text-center text-gray-400 py-4">Loading...</td></tr>
          ) : data.length === 0 ? (
            <tr><td colSpan={8} className="text-center text-gray-400 py-4">No data found.</td></tr>
          ) : (
            data.map((entry) => (
              <tr key={entry.player_name + entry.rank + (entry.region || '')} className="border-b border-gray-800 hover:bg-gray-800/50 transition-colors">
                <td className={`px-4 py-3 text-sm font-medium text-zinc-400 ${colClassName}`}>#{entry.rank}</td>
                {showDeltas && (
                  <td className={`px-4 py-3 text-sm font-medium text-zinc-400 ${colClassName}`}>
                    {entry.rank_delta !== undefined ? (
                      entry.rank_delta > 0 ? (
                        <span className="text-green-400">+{entry.rank_delta}</span>
                      ) : entry.rank_delta < 0 ? (
                        <span className="text-red-400">{entry.rank_delta}</span>
                      ) : (
                        <span className="text-zinc-400">—</span>
                      )
                    ) : <span className="text-zinc-400">—</span>}
                  </td>
                )}
                <td className={`px-4 py-3 ${colClassName}`}>
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/stats/${entry.player_name}?r=${entry.region?.toLowerCase()}`}
                      className="text-blue-300 font-semibold hover:underline"
                      target="_blank"
                    >
                      {entry.player_name}
                    </Link>
                    <SocialIndicators playerName={entry.player_name} channelData={channelData} />
                  </div>
                </td>
                <td className={`px-4 py-3 text-left text-lg font-semibold text-white ${colClassName}`}>{entry.rating}</td>
                {showDeltas && (
                  <td className={`px-4 py-3 text-left ${colClassName}`}>
                    {entry.rating_delta !== undefined ? (
                      entry.rating_delta > 0 ? (
                        <span className="text-green-400">+{entry.rating_delta}</span>
                      ) : entry.rating_delta < 0 ? (
                        <span className="text-red-400">{entry.rating_delta}</span>
                      ) : (
                        <span className="text-zinc-400">—</span>
                      )
                    ) : <span className="text-zinc-400">—</span>}
                  </td>
                )}
                {showGames && (
                  <td className={`px-4 py-3 text-left text-white ${colClassName}`}>{entry.games_played ?? '—'}</td>
                )}
                {showMode && (
                  <td className={`px-4 py-3 text-left text-white ${colClassName}`}>{entry.game_mode === '1' ? 'Duo' : 'Solo'}</td>
                )}
                {showRegion && (
                  <td className={`px-4 py-3 text-left text-white ${colClassName}`}>{entry.region}</td>
                )}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
} 