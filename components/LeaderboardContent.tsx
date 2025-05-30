'use client';

import { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import { supabase } from '@/utils/supabaseClient';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { DateTime } from 'luxon';

interface LeaderboardEntry {
  player_name: string;
  rating: number;
  rank: number;
  region: string;
  games_played: number;
  rating_delta: number;
  rank_delta: number;
}

interface RawLeaderboardEntry {
  player_name: string;
  rating: number;
  rank: number;
  region: string;
  games_played?: number;
}

interface BaselineEntry {
  player_name: string;
  rating: number;
  rank: number;
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

  const [sortColumn, setSortColumn] = useState<'rank' | 'rank_delta' | 'rating' | 'rating_delta' | 'games_played'>('rank');
  const [sortAsc, setSortAsc] = useState(true);
  const [timeframe, setTimeframe] = useState<'day' | 'week'>('day');
  const fullFetchedRef = useRef(false);

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
    if (limit === 1000) {
      if (fullFetchedRef.current) return;
      fullFetchedRef.current = true;
    }
    try {
      setLoadingMore(true);
      let data;

      // Compute current PT date at midnight
      const ptNow = DateTime.now().setZone('America/Los_Angeles').startOf('day');

      if (region === 'all') {
        const currentStart = ptNow.toISODate() || '';

        // Fetch top N from each region and combine
        const regionCodes = regions.map(r => r.toUpperCase());
        let combinedData: RawLeaderboardEntry[] = [];

        for (const reg of regionCodes) {
          const { data: regData, error: regError } = await supabase
            .from('daily_leaderboard_stats')
            .select('player_name, rating, region, games_played')
            .eq('day_start', currentStart)
            .eq('game_mode', solo ? '0' : '1')
            .eq('region', reg)
            .order('rank', { ascending: true })
            .limit(limit);

          if (regError) {
            console.error(`Error fetching leaderboard for region ${reg}:`, regError);
            throw regError;
          }

          combinedData = combinedData.concat(regData || []);
        }

        // Normalize and zero out deltas
        const baseData = combinedData.map((p: RawLeaderboardEntry) => ({
          ...p,
          games_played: p.games_played ?? 0,
          rating_delta: 0,
          rank_delta: 0,
        }));

        // Compute global ranks and take top limit
        const rankedData = processRanks(baseData).slice(0, limit);
        setLeaderboardData(rankedData);
        setShowingAll(limit > 100);
      } else {
        // Compute period and baseline based on timeframe in PT
        let currentStart: string;
        let prevStart: string;
        if (timeframe === 'day') {
          currentStart = ptNow.toISODate() || '';
          prevStart = ptNow.minus({ days: 1 }).toISODate() || '';
        } else {
          // Weekly baseline: start of current week (Monday)
          const weekStart = ptNow.startOf('week').minus({ days: 1 });
          currentStart = ptNow.toISODate() || '';
          prevStart = weekStart.toISODate() || '';
        }

        // Fetch current period stats using currentStart in PT
        // For week: also select weekly_games_played
        const result = await supabase
          .from('daily_leaderboard_stats')
          .select('player_name, rating, rank, region, games_played, weekly_games_played')
          .eq('region', region.toUpperCase())
          .eq('game_mode', solo ? '0' : '1')
          .eq('day_start', currentStart)
          .order('rank', { ascending: true })
          .limit(limit);
        if (result.error) {
          console.error('Error fetching leaderboard:', result.error);
          throw result.error;
        }
        console.log(`Fetched ${result.data?.length ?? 0} current entries for ${currentStart}`, result.data);

        // Paginated fetch of baseline stats on prevStart
        const baselineDate = prevStart;
        const baselinePageSize = 1000;
        let baselineResults: BaselineEntry[] = [];
        let baseOffset = 0;
        while (true) {
          const { data: baseChunk, error: baseErr } = await supabase
            .from('daily_leaderboard_stats')
            .select('player_name, rating, rank')
            .eq('region', region.toUpperCase())
            .eq('game_mode', solo ? '0' : '1')
            .eq('day_start', baselineDate)
            .order('rank', { ascending: true })
            .range(baseOffset, baseOffset + baselinePageSize - 1);
          if (baseErr) {
            console.error('Error fetching baseline leaderboard:', baseErr);
            throw baseErr;
          }
          baselineResults = baselineResults.concat(baseChunk || []);
          if (!baseChunk || baseChunk.length < baselinePageSize) break;
          baseOffset += baselinePageSize;
        }
        console.log(`Fetched ${baselineResults.length} baseline entries for ${baselineDate}`);
        const yesterMap = Object.fromEntries(
          baselineResults.map(e => [e.player_name, e])
        );

        // Build final entries
        type RawLeaderboardEntryWithWeekly = RawLeaderboardEntry & { weekly_games_played?: number };
        const data = (result.data || []).map((p: RawLeaderboardEntryWithWeekly) => {
          if (!yesterMap[p.player_name]) {
            console.warn(`No baseline entry for ${p.player_name} on ${baselineDate}`);
          }
          const y = yesterMap[p.player_name] || { rating: p.rating, rank: p.rank };
          return {
            ...p,
            games_played: timeframe === 'week'
              ? (p.weekly_games_played ?? 0)
              : (p.games_played ?? 0),
            rating_delta: p.rating - y.rating,
            rank_delta: y.rank - p.rank,
          } as LeaderboardEntry;
        });
        setLeaderboardData(data);
        setShowingAll(limit > 100);
      }
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
      throw error;
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [region, solo, timeframe]);

  // Initial fetch
  useEffect(() => {
    setLoading(true);
    setShowingAll(false);
    void fetchLeaderboard();
  }, [region, solo, timeframe, fetchLeaderboard]);

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

  const sortedData = useMemo(() => {
    const dataCopy = [...leaderboardData];
    dataCopy.sort((a, b) => {
      const valA = a[sortColumn];
      const valB = b[sortColumn];
      if (valA < valB) return sortAsc ? -1 : 1;
      if (valA > valB) return sortAsc ? 1 : -1;
      return 0;
    });
    return dataCopy;
  }, [leaderboardData, sortColumn, sortAsc]);

  const filteredData = useMemo(() => {
    if (!searchQuery) return sortedData;
    const query = searchQuery.toLowerCase();
    return sortedData.filter(entry => 
      entry.player_name.toLowerCase().includes(query) ||
      entry.rank.toString().includes(query)
    );
  }, [sortedData, searchQuery]);

  if (loading) {
    return (
      <div className="container mx-auto p-4">
        <div className="bg-gray-900 rounded-lg p-6">
          <div className="text-2xl font-bold text-white mb-4 text-center">Loading...</div>
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
            {region !== 'all' && (
              <div className="flex bg-gray-800 rounded-full p-1 ml-4">
                <button
                  onClick={() => setTimeframe('day')}
                  className={`px-4 py-1.5 rounded-full transition ${
                    timeframe === 'day'
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-300 hover:bg-gray-700'
                  }`}
                >
                  Day
                </button>
                <button
                  onClick={() => setTimeframe('week')}
                  className={`px-4 py-1.5 rounded-full transition ${
                    timeframe === 'week'
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-300 hover:bg-gray-700'
                  }`}
                >
                  Week
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="mb-6 relative">
          <input
            type="text"
            placeholder="Search by player name or rank..."
            value={searchQuery}
            onClick={() => void fetchLeaderboard(1000)}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-2 bg-gray-800 text-white rounded-lg border border-gray-700 focus:outline-none focus:border-blue-500 transition-colors"
          />
          {searchQuery && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
              {filteredData.length} result{filteredData.length !== 1 ? 's' : ''}
            </div>
          )}
        </div>

        { filteredData.length === 0 && <div className="text-2xl font-bold text-white mb-4 text-center">
          Error fetching leaderboard, try refreshing the page.
        </div> }

        { filteredData.length > 0 && <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              {region === 'all' ? (
                <tr className="text-sm font-medium text-zinc-400 border-b border-gray-800">
                  <th className="px-4 py-2 text-left">Rank</th>
                  <th className="px-4 py-2 text-left">Player</th>
                  <th className="px-4 py-2 text-right">Rating</th>
                </tr>
              ) : (
                <tr className="text-sm font-medium text-zinc-400 border-b border-gray-800">
                  <th
                    className="px-4 py-2 text-left cursor-pointer select-none"
                    onClick={() => {
                      if (sortColumn === 'rank') setSortAsc(!sortAsc);
                      else { setSortColumn('rank'); setSortAsc(true); }
                      void fetchLeaderboard(1000);
                    }}
                  >
                    Rank{sortColumn === 'rank' ? (sortAsc ? ' ▲' : ' ▼') : ''}
                  </th>
                  <th
                    className="px-4 py-2 text-left cursor-pointer select-none"
                    onClick={() => {
                      if (sortColumn === 'rank_delta') setSortAsc(!sortAsc);
                      else { setSortColumn('rank_delta'); setSortAsc(false); }
                      void fetchLeaderboard(1000);
                    }}
                  >
                    ΔRank{sortColumn === 'rank_delta' ? (sortAsc ? ' ▲' : ' ▼') : ''}
                  </th>
                  <th className="px-4 py-2 text-left">Player</th>
                  <th
                    className="px-4 py-2 cursor-pointer select-none text-left"
                    onClick={() => {
                      if (sortColumn === 'rating') setSortAsc(!sortAsc);
                      else { setSortColumn('rating'); setSortAsc(true); }
                      void fetchLeaderboard(1000);
                    }}
                  >
                    Rating{sortColumn === 'rating' ? (sortAsc ? ' ▲' : ' ▼') : ''}
                  </th>
                  <th
                    className="px-4 py-2 cursor-pointer select-none text-left"
                    onClick={() => {
                      if (sortColumn === 'rating_delta') setSortAsc(!sortAsc);
                      else { setSortColumn('rating_delta'); setSortAsc(false); }
                      void fetchLeaderboard(1000);
                    }}
                  >
                    ΔRating{sortColumn === 'rating_delta' ? (sortAsc ? ' ▲' : ' ▼') : ''}
                  </th>
                  <th
                    className="px-4 py-2 cursor-pointer select-none text-left"
                    onClick={() => {
                      if (sortColumn === 'games_played') setSortAsc(!sortAsc);
                      else { setSortColumn('games_played'); setSortAsc(false); }
                      void fetchLeaderboard(1000);
                    }}
                  >
                    Games{sortColumn === 'games_played' ? (sortAsc ? ' ▲' : ' ▼') : ''}
                  </th>
                </tr>
              )}
            </thead>
            <tbody>
              {filteredData.map((entry) => (
                <tr
                  key={entry.player_name + entry.region}
                  className="border-b border-gray-800 hover:bg-gray-800/50 transition-colors"
                >
                  {region === 'all' ? (
                    <>
                      <td className="px-4 py-3 text-sm font-medium text-zinc-400">
                        #{entry.rank}
                      </td>
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
                      <td className="px-4 py-3 text-right text-lg font-semibold text-white">
                        {entry.rating}
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="px-4 py-3 text-sm font-medium text-zinc-400">
                        #{entry.rank}
                      </td>
                      <td className="px-4 py-3 text-sm font-medium text-zinc-400">
                        {entry.rank_delta > 0 ? (
                          <span className="text-green-400">+{entry.rank_delta}</span>
                        ) : entry.rank_delta < 0 ? (
                          <span className="text-red-400">{entry.rank_delta}</span>
                        ) : (
                          <span className="text-zinc-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Link
                            href={`/stats/${entry.player_name}?r=${entry.region.toLowerCase()}`}
                            className="text-blue-300 hover:text-blue-500 hover:underline font-semibold transition-colors cursor-pointer"
                          >
                            {entry.player_name}
                          </Link>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-left text-lg font-semibold text-white">
                        {entry.rating}
                      </td>
                      <td className="px-4 py-3 text-left">
                        {entry.rating_delta > 0 ? (
                          <span className="text-green-400">+{entry.rating_delta}</span>
                        ) : entry.rating_delta < 0 ? (
                          <span className="text-red-400">{entry.rating_delta}</span>
                        ) : (
                          <span className="text-zinc-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-left text-white">
                        {entry.games_played}
                      </td>
                    </>
                  )}
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
      }
      </div>
    </div>
  );
}