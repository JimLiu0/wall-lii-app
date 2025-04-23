'use client';

import { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import { supabase } from '@/utils/supabaseClient';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface LeaderboardEntry {
  player_name: string;
  rating: number;
  rank: number;
  region: string;
}

interface Props {
  region: string;
  defaultSolo?: boolean;
  searchParams?: { mode?: string };
}

const regions = ['na', 'eu', 'ap', 'cn'] as const;

function processRanks(data: LeaderboardEntry[]): LeaderboardEntry[] {
  // Sort by rating in descending order
  return [...data]
    .sort((a, b) => b.rating - a.rating)
    .map((entry, index) => ({
      ...entry,
      rank: index + 1
    }));
}

export default function LeaderboardContent({ region, defaultSolo = true, searchParams }: Props) {
  const router = useRouter();
  const [leaderboardData, setLeaderboardData] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [showingAll, setShowingAll] = useState(false);
  const [solo, setSolo] = useState(() => {
    // Initialize from URL params if available
    const urlGameMode = searchParams?.mode;
    if (urlGameMode === 'solo' || urlGameMode === 'duo') {
      return urlGameMode === 'solo';
    }
    // Fall back to localStorage or default
    const storedGameMode = localStorage.getItem('preferredGameMode');
    return storedGameMode ? storedGameMode === 'solo' : defaultSolo;
  });
  const [searchQuery, setSearchQuery] = useState('');
  const observerTarget = useRef<HTMLDivElement>(null);

  // Save preferences to localStorage when they change
  useEffect(() => {
    localStorage.setItem('preferredRegion', region);
    localStorage.setItem('preferredGameMode', solo ? 'solo' : 'duo');
  }, [region, solo]);

  useEffect(() => {
    const currentMode = searchParams?.mode;
    const expectedMode = solo ? 'solo' : 'duo';
    const correctUrl = region === 'all' ? `/all?mode=${expectedMode}` : `/lb/${region}?mode=${expectedMode}`;
  
    if (currentMode !== expectedMode) {
      router.replace(correctUrl);
    }
  }, [region, solo, searchParams, router]);

  const fetchLeaderboard = useCallback(async (limit: number = 100) => {
    try {
      setLoadingMore(true);
      let data;
      let error;

      if (region === 'all') {
        const result = await supabase.rpc('get_global_leaderboard_with_duplicates_v2', {
          game_mode_input: solo ? '0' : '1',
          limit_input: limit
        });
        data = result.data;
        error = result.error;
      } else {
        const result = await supabase.rpc('get_latest_snapshots_per_rank_v2', {
          region_input: region.toUpperCase(),
          game_mode_input: solo ? '0' : '1',
          limit_input: limit
        });
        data = result.data;
        error = result.error;
      }

      if (error) throw error;
      const processedData = processRanks(data || []);
      setLeaderboardData(processedData);
      setShowingAll(limit > 100);
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
      setLeaderboardData([]);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [region, solo]);

  // Initial fetch
  useEffect(() => {
    setLoading(true);
    setShowingAll(false);
    void fetchLeaderboard();
  }, [region, solo, fetchLeaderboard]);

  // Handle region button clicks
  const handleRegionChange = (newRegion: string) => {
    if (region !== newRegion) {
      localStorage.setItem('preferredRegion', newRegion);
      // Preserve the current game mode in the URL
      const gameMode = solo ? 'solo' : 'duo';
      const url = newRegion === 'all' ? `/lb/all?mode=${gameMode}` : `/lb/${newRegion}?mode=${gameMode}`;
      router.push(url);
    }
  };

  // Handle game mode changes
  const handleGameModeChange = (isSolo: boolean) => {
    setSolo(isSolo);
    localStorage.setItem('preferredGameMode', isSolo ? 'solo' : 'duo');
    // Update URL with current game mode
    const gameMode = isSolo ? 'solo' : 'duo';
    const url = region === 'all' ? `lb/all?mode=${gameMode}` : `/lb/${region}?mode=${gameMode}`;
    router.push(url);
  };

  // Infinite scroll observer
  useEffect(() => {
    if (loading || showingAll) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !loadingMore && !showingAll && !searchQuery) {
          void fetchLeaderboard(1000);
        }
      },
      { threshold: 0.1 }
    );

    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }

    return () => observer.disconnect();
  }, [loading, loadingMore, showingAll, searchQuery, fetchLeaderboard]);

  const handleSearchClick = () => {
    if (!showingAll) {
      void fetchLeaderboard(1000);
    }
  };

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
        <div className="text-xl sm:text-2xl font-semibold mb-6 text-center">
          <div className="mt-4 flex justify-center items-center gap-4 flex-wrap">
            <div className="flex bg-gray-800 rounded-full p-1">
              <button
                key="all"
                onClick={() => handleRegionChange('all')}
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
                  onClick={() => handleRegionChange(r)}
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
                onClick={() => handleGameModeChange(true)}
                className={`px-4 py-1.5 rounded-full transition ${
                  solo
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-300 hover:bg-gray-700'
                }`}
              >
                Solo
              </button>
              <button
                onClick={() => handleGameModeChange(false)}
                className={`px-4 py-1.5 rounded-full transition ${
                  !solo
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-300 hover:bg-gray-700'
                }`}
              >
                Duo
              </button>
            </div>
          </div>
        </div>

        <div className="mb-6 relative">
          <input
            type="text"
            placeholder="Search by player name or rank..."
            value={searchQuery}
            onClick={() => handleSearchClick()}
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
              <tr className="text-sm font-medium text-zinc-400 border-b border-gray-800">
                <th className="px-4 py-2 text-left">Rank</th>
                <th className="px-4 py-2 text-left">Player</th>
                <th className="px-4 py-2 text-right">Rating</th>
              </tr>
            </thead>
            <tbody>
              {filteredData.map((entry) => (
                <tr
                  key={entry.rank}
                  className="border-b border-gray-800 hover:bg-gray-800/50 transition-colors"
                >
                  <td className="px-4 py-3 text-sm font-medium text-zinc-400">#{entry.rank}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/stats/${entry.player_name}?r=${entry.region.toLowerCase()}`}
                        className="text-blue-300 hover:text-blue-500 hover:underline font-semibold transition-colors cursor-pointer"
                      >
                        {entry.player_name} {region === 'all' && (
                          <span className="text-sm text-gray-400 hover:text-white transition-colors">
                            ({entry.region})
                          </span>
                        )}
                      </Link>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right text-lg font-semibold text-white">{entry.rating}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!showingAll && !searchQuery && (
            <div
              ref={observerTarget}
              className="py-8 text-center text-sm font-medium text-zinc-400"
            >
              {loadingMore ? (
                'Loading more players...'
              ) : (
                'Scroll down or click search to view all players'
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 