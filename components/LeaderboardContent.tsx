'use client';

import { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/utils/supabaseClient';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface LeaderboardEntry {
  player_name: string;
  rating: number;
  rank: number;
  region: string;
}

const regions = ['na', 'eu', 'ap', 'cn'] as const;
const emojiMap = {
  'na': '🇺🇸',
  'eu': '🇪🇺',
  'ap': '🐉',
  'cn': '🇨🇳'
};

function processRanks(data: LeaderboardEntry[]): LeaderboardEntry[] {
  // Sort by rating in descending order
  return [...data]
    .sort((a, b) => b.rating - a.rating)
    .map((entry, index) => ({
      ...entry,
      rank: index + 1
    }));
}

export default function LeaderboardContent({ region }: { region: string }) {
  const router = useRouter();
  const [leaderboardData, setLeaderboardData] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [solo, setSolo] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    async function fetchLeaderboard() {
      try {
        setLoading(true);
        let data;
        let error;

        if (region === 'all') {
          const result = await supabase.rpc('get_global_leaderboard_with_duplicates', {
            game_mode_input: solo ? '0' : '1',
            limit_input: 1000
          });
          data = result.data;
          error = result.error;
        } else {
          const result = await supabase.rpc('get_latest_snapshots_per_rank', {
            region_input: region.toUpperCase(),
            game_mode_input: solo ? '0' : '1',
          });
          data = result.data;
          error = result.error;
        }

        if (error) throw error;
        // Process ranks for both global and regional data
        const processedData = processRanks(data || []);
        setLeaderboardData(processedData);
      } catch (error) {
        console.error('Error fetching leaderboard:', error);
        setLeaderboardData([]);
      } finally {
        setLoading(false);
      }
    }

    void fetchLeaderboard();
  }, [region, solo]);

  const filteredData = useMemo(() => {
    if (!searchQuery) return leaderboardData;
    const query = searchQuery.toLowerCase();
    return leaderboardData.filter(entry => 
      entry.player_name.toLowerCase().includes(query) ||
      entry.rank.toString().includes(query)
    );
  }, [leaderboardData, searchQuery]);

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
            No players found in {region === 'all' ? 'Global' : region.toUpperCase()}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 max-w-4xl">
      <div className="bg-gray-900 rounded-lg p-6">
        <div className="text-2xl font-bold text-white mb-6 text-center">
          <div className="mt-4 flex justify-center items-center gap-4 flex-wrap">
            <div className="flex bg-gray-800 rounded-full p-1">
              <button
                key="all"
                onClick={() => router.push('/')}
                className={`px-4 py-1.5 rounded-full transition ${
                  !region || region === 'all'
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-300 hover:bg-gray-700'
                }`}
              >
                ALL
              </button>
              {regions.map((r) => (
                <button
                  key={r}
                  onClick={() => router.push(`/${r}`)}
                  className={`px-4 py-1.5 rounded-full transition ${
                    region === r
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-300 hover:bg-gray-700'
                  }`}
                >
                  {r.toUpperCase()}
                </button>
              ))}
            </div>

            <div className="flex bg-gray-800 rounded-full p-1">
              <button
                onClick={() => setSolo(true)}
                className={`px-4 py-1.5 rounded-full transition ${
                  solo
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-300 hover:bg-gray-700'
                }`}
              >
                Solo
              </button>
              <button
                onClick={() => setSolo(false)}
                className={`px-4 py-1.5 rounded-full transition ${
                  !solo
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-300 hover:bg-gray-700'
                }`}
              >
                Duo
              </button>
            </div>

            <span>Leaderboard</span>
          </div>
        </div>

        <div className="mb-6 relative">
          <input
            type="text"
            placeholder="Search by player name or rank..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-2 bg-gray-800 text-white rounded-lg border border-gray-700 focus:outline-none focus:border-blue-500 transition-colors"
          />
          {searchQuery && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
              {filteredData.length} result{filteredData.length !== 1 ? 's' : ''}
            </div>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-gray-400 border-b border-gray-800">
                <th className="px-4 py-2 text-left">Rank</th>
                <th className="px-4 py-2 text-left">Player</th>
                {region === 'all' && (
                  <th className="px-4 py-2 text-left">Region</th>
                )}
                <th className="px-4 py-2 text-right">Rating</th>
              </tr>
            </thead>
            <tbody>
              {filteredData.map((entry) => (
                <tr
                  key={entry.rank}
                  className="border-b border-gray-800 hover:bg-gray-800/50 transition-colors"
                >
                  <td className="px-4 py-3 text-gray-300">{entry.rank}</td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/${entry.region.toLowerCase()}/${entry.player_name}?v=s&o=0`}
                      className="text-blue-400 hover:text-blue-300 transition-colors"
                    >
                      {entry.player_name}
                    </Link>
                  </td>
                  {region === 'all' && (
                    <td className="px-4 py-3">
                      <Link
                        href={`/${entry.region.toLowerCase()}`}
                        className="inline-block text-2xl hover:scale-110 transition-transform"
                      >
                        {emojiMap[entry.region.toLowerCase() as keyof typeof emojiMap] || entry.region}
                      </Link>
                    </td>
                  )}
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