'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/utils/supabaseClient';
import Link from 'next/link';

interface LeaderboardEntry {
  player_name: string;
  rating: number;
  rank: number;
  region: string;
}

export default function LeaderboardContent({ region }: { region: string }) {
  const [leaderboardData, setLeaderboardData] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchLeaderboard() {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('current_leaderboard')
          .select('player_name, rating, rank, region')
          .eq('region', region.toUpperCase())
          .eq('game_mode', '0')
          .order('rank', { ascending: true });

        if (error) throw error;
        setLeaderboardData(data || []);
      } catch (error) {
        console.error('Error fetching leaderboard:', error);
        setLeaderboardData([]);
      } finally {
        setLoading(false);
      }
    }

    void fetchLeaderboard();
  }, [region]);

  if (loading) {
    return (
      <div className="container mx-auto p-4">
        <div className="bg-gray-900 rounded-lg p-6">
          <div className="text-2xl font-bold text-white mb-4 text-center">Loading...</div>
        </div>
      </div>
    );
  }

  if (leaderboardData.length === 0) {
    return (
      <div className="container mx-auto p-4 max-w-4xl">
        <div className="bg-gray-900 rounded-lg p-6">
          <div className="text-2xl font-bold text-white mb-4 text-center">
            No players found in {region.toUpperCase()}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 max-w-4xl">
      <div className="bg-gray-900 rounded-lg p-6">
        <div className="text-2xl font-bold text-white mb-6 text-center">
          {region.toUpperCase()} Leaderboard
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-gray-400 border-b border-gray-800">
                <th className="px-4 py-2 text-left">Rank</th>
                <th className="px-4 py-2 text-left">Player</th>
                <th className="px-4 py-2 text-right">Rating</th>
              </tr>
            </thead>
            <tbody>
              {leaderboardData.map((entry) => (
                <tr
                  key={entry.player_name}
                  className="border-b border-gray-800 hover:bg-gray-800/50 transition-colors"
                >
                  <td className="px-4 py-3 text-gray-300">{entry.rank}</td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/${entry.player_name}/${region}/s/0`}
                      className="text-blue-400 hover:text-blue-300 transition-colors"
                    >
                      {entry.player_name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-right text-gray-300">{entry.rating}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
} 