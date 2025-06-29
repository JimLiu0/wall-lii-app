'use client';

import { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import { supabase } from '@/utils/supabaseClient';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { DateTime } from 'luxon';
import ButtonGroup from './ButtonGroup';
import SocialIndicators from './SocialIndicators';

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
  weekly_games_played?: number;
  rating_delta?: number;
}

interface BaselineEntry {
  player_name: string;
  rating: number;
  rank: number;
}

interface ChannelEntry {
  channel: string;
  player: string;
  live: boolean;
  youtube?: string;
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
  const [channelData, setChannelData] = useState<ChannelEntry[]>([]);
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

  const [sortColumn, setSortColumn] = useState<'rank' | 'rank_delta' | 'rating' | 'rating_delta' | 'games_played' | 'player_name'>('rank');
  const [sortAsc, setSortAsc] = useState(true);
  const [timeframe, setTimeframe] = useState<'day' | 'week'>('day');
  const fullFetchedRef = useRef(false);
  const [showInfoModal, setShowInfoModal] = useState(false);

  // Fetch channel data
  const fetchChannelData = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('channels')
        .select('channel, player, live, youtube');
      
      if (error) {
        console.error('Error fetching channel data:', error);
        return;
      }
      
      setChannelData(data || []);
    } catch (error) {
      console.error('Error fetching channel data:', error);
    }
  }, []);

  // Save preferences to localStorage when they change
  useEffect(() => {
    localStorage.setItem('preferredRegion', region);
    localStorage.setItem('preferredGameMode', solo ? 'solo' : 'duo');
    
    // Dispatch custom event to notify other components in the same tab
    window.dispatchEvent(new Event('localStorageChange'));
  }, [region, solo]);

  useEffect(() => {
    const currentMode = searchParams?.mode;
    const expectedMode = solo ? 'solo' : 'duo';
    const correctUrl = region === 'all' ? `/all?mode=${expectedMode}` : `/lb/${region}?mode=${expectedMode}`;
  
    if (currentMode !== expectedMode) {
      router.replace(correctUrl);
    }
  }, [region, solo, searchParams, router]);

  // Fetch channel data on component mount
  useEffect(() => {
    void fetchChannelData();
  }, [fetchChannelData]);

  const fetchLeaderboard = useCallback(async (limit: number = 100) => {
    if (limit === 1000) {
      if (fullFetchedRef.current) return;
      fullFetchedRef.current = true;
    }
    let data;
    try {
      setLoadingMore(true);
      // Compute PT date and inputs
      const ptNow = DateTime.now().setZone('America/Los_Angeles').startOf('day');
      const dayStart = ptNow.toISODate() || '';
      const mode = solo ? '0' : '1';

      let entries: LeaderboardEntry[] = [];

      if (region === 'all') {
        // Determine previous period start
        let prevStart: string;
        if (timeframe === 'day') {
          prevStart = ptNow.minus({ days: 1 }).toISODate() || '';
        } else {
          const weekStart = ptNow.startOf('week').minus({ days: 1 });
          prevStart = weekStart.toISODate() || '';
        }
        // Fetch top N per region, with rating_delta
        const regionsUpper = regions.map(r => r.toUpperCase());
        let combinedRaw: RawLeaderboardEntry[] = [];
        for (const reg of regionsUpper) {
          // Fetch current stats
          const { data: currentChunk, error: currErr } = await supabase
            .from('daily_leaderboard_stats')
            .select('player_name, rating, region, games_played, weekly_games_played')
            .eq('day_start', dayStart)
            .eq('game_mode', mode)
            .eq('region', reg)
            .limit(limit)
            .order('rank', { ascending: true });
          if (currErr) throw currErr;

          // Fetch baseline stats
          const { data: baselineChunk, error: baseErr } = await supabase
            .from('daily_leaderboard_stats')
            .select('player_name, rating')
            .eq('day_start', prevStart)
            .eq('game_mode', mode)
            .eq('region', reg)
            .limit(limit)
            .order('rank', { ascending: true });
          if (baseErr) throw baseErr;

          const prevMap = Object.fromEntries(
            (baselineChunk || []).map(p => [p.player_name, p.rating])
          );

          // Combine with delta
          const chunkWithDelta = (currentChunk || []).map(p => ({
            ...p,
            games_played: timeframe === 'week' ? p.weekly_games_played ?? 0 : p.games_played ?? 0,
            rating_delta: p.rating - (prevMap[p.player_name] ?? p.rating),
            rank: 0
          }));
          combinedRaw = combinedRaw.concat(chunkWithDelta);
        }
        // Map to full entries and rank globally
        const mapped = combinedRaw.map(p => ({
          player_name: p.player_name,
          rating: p.rating,
          rank: 0,            // placeholder before ranking
          region: p.region,
          games_played: p.games_played ?? 0,
          rating_delta: p.rating_delta ?? 0,
          rank_delta: 0,
        }));
        entries = processRanks(mapped).slice(0, limit);
      } else {
        // Single-region logic (unchanged)
        // ... keep existing code for fetching current and baseline stats ...
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
        const yesterMap = Object.fromEntries(
          baselineResults.map(e => [e.player_name, e])
        );

        // Build final entries
        type RawLeaderboardEntryWithWeekly = RawLeaderboardEntry & { weekly_games_played?: number };
        data = (result.data || []).map((p: RawLeaderboardEntryWithWeekly) => {
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
        entries = data; // where data is the LeaderboardEntry[] you build
      }

      setLeaderboardData(entries);
      setShowingAll(limit > 100);
    } 
    catch (error) {
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

  // Info content for modal
  const regionNames = {
    na: 'Americas',
    eu: 'Europe',
    ap: 'Asia Pacific',
    cn: 'China',
    all: 'Global',
  };
  const leaderboardLink = region === 'cn'
    ? 'https://hs.blizzard.cn/community/leaderboards/'
    : `https://hearthstone.blizzard.com/en-us/community/leaderboards?region=${region}&leaderboardId=battlegrounds${searchParams?.mode === 'duo' ? 'duo' : ''}`;
  const regionName = regionNames[region as keyof typeof regionNames];

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
        {/* Info row */}
        <div className="flex items-center justify-center mb-2 text-center">
          <h1 className="text-xl sm:text-2xl font-semibold text-white flex items-center gap-2 flex-wrap justify-center">
            {regionName} Leaderboard
            <button
              className="flex items-center gap-1 text-blue-400 hover:text-blue-300 text-sm px-2 py-1 rounded transition-colors border border-blue-400 hover:bg-blue-900"
              onClick={() => setShowInfoModal(!showInfoModal)}
              aria-label="Toggle leaderboard info"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" fill="none"/><path d="M12 16v-4M12 8h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
            </button>
          </h1>
        </div>
        
        {/* Expandable Info Section */}
        {showInfoModal && (
          <div className="mb-4 p-4 bg-gray-800/50 rounded-lg border border-gray-700">
            <div className="space-y-2 text-sm text-gray-300">
              <p>
                Rankings are fetched from the{' '}
                <a
                  href={leaderboardLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-400 hover:underline"
                >
                  official leaderboards
                </a>{' '}
                every 5 minutes. Wallii fetches the top 1000 players in each region.
              </p>
              <p>All stats and resets use Pacific Time (PT) midnight as the daily/weekly reset.</p>
              {region === 'cn' && (
                <p>Blizzard CN only updates their leaderboards every hour.</p>
              )}
            </div>
          </div>
        )}

        <div className="text-xl sm:text-2xl font-semibold mb-6 text-center">
          <div className="mt-4 flex flex-col lg:flex-row lg:items-center lg:justify-center lg:gap-6 gap-4 items-center">
            <ButtonGroup
              options={[{ label: 'ALL', value: 'all' }, ...regions.map(r => ({ label: r.toUpperCase(), value: r }))]}
              selected={region || 'all'}
              onChange={handleRegionChange}
            />
            <div className="flex items-center gap-4">
              <ButtonGroup
                options={[{ label: 'Solo', value: true }, { label: 'Duo', value: false }]}
                selected={solo}
                onChange={handleGameModeChange}
              />
              <ButtonGroup
                options={['day', 'week'].map(v => ({ label: v[0].toUpperCase() + v.slice(1), value: v }))}
                selected={timeframe}
                onChange={(val) => setTimeframe(val as 'day' | 'week')}
              />
            </div>
          </div>
        </div>

        <div className="mb-6 relative">
          <input
            type="text"
            placeholder="Filter by player name or rank..."
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
          No results found.
        </div> }

        { filteredData.length > 0 && <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-sm font-medium text-zinc-400 border-b border-gray-800">
                <th className="sticky left-0 bg-gray-900 z-10 px-4 py-2 text-left cursor-pointer"
                    onClick={() => {
                      if (sortColumn === 'rank') setSortAsc(!sortAsc);
                      else { setSortColumn('rank'); setSortAsc(true); }
                      void fetchLeaderboard(1000);
                    }}>
                  Rank{sortColumn === 'rank' ? (sortAsc ? ' ▲' : ' ▼') : ''}
                </th>
                {region !== 'all' && (
                  <th className="px-4 py-2 text-left cursor-pointer"
                      onClick={() => {
                        if (sortColumn === 'rank_delta') setSortAsc(!sortAsc);
                        else { setSortColumn('rank_delta'); setSortAsc(false); }
                        void fetchLeaderboard(1000);
                      }}>
                    ΔRank{sortColumn === 'rank_delta' ? (sortAsc ? ' ▲' : ' ▼') : ''}
                  </th>
                )}
                <th className="px-4 py-2 text-left cursor-pointer"
                    onClick={() => {
                      if (sortColumn === 'player_name') setSortAsc(!sortAsc);
                      else { setSortColumn('player_name'); setSortAsc(true); }
                      void fetchLeaderboard(1000);
                    }}>
                  Player{sortColumn === 'player_name' ? (sortAsc ? ' ▲' : ' ▼') : ''}
                </th>
                <th className="px-4 py-2 text-left cursor-pointer"
                    onClick={() => {
                      if (sortColumn === 'rating') setSortAsc(!sortAsc);
                      else { setSortColumn('rating'); setSortAsc(true); }
                      void fetchLeaderboard(1000);
                    }}>
                  Rating{sortColumn === 'rating' ? (sortAsc ? ' ▲' : ' ▼') : ''}
                </th>
                <th className="px-4 py-2 text-left cursor-pointer"
                    onClick={() => {
                      if (sortColumn === 'rating_delta') setSortAsc(!sortAsc);
                      else { setSortColumn('rating_delta'); setSortAsc(false); }
                      void fetchLeaderboard(1000);
                    }}>
                  ΔRating{sortColumn === 'rating_delta' ? (sortAsc ? ' ▲' : ' ▼') : ''}
                </th>
                <th className="px-4 py-2 text-left cursor-pointer"
                    onClick={() => {
                      if (sortColumn === 'games_played') setSortAsc(!sortAsc);
                      else { setSortColumn('games_played'); setSortAsc(false); }
                      void fetchLeaderboard(1000);
                    }}>
                  Games{sortColumn === 'games_played' ? (sortAsc ? ' ▲' : ' ▼') : ''}
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredData.map((entry) => (
                <tr
                  key={entry.player_name + entry.region}
                  className="border-b border-gray-800 hover:bg-gray-800/50 transition-colors"
                >
                  <td className="sticky left-0 bg-gray-900 px-4 py-3 text-sm font-medium text-zinc-400">
                    #{entry.rank}
                  </td>
                  {region !== 'all' && (
                    <td className="px-4 py-3 text-sm font-medium text-zinc-400">
                      {entry.rank_delta > 0 ? (
                        <span className="text-green-400">+{entry.rank_delta}</span>
                      ) : entry.rank_delta < 0 ? (
                        <span className="text-red-400">{entry.rank_delta}</span>
                      ) : (
                        <span className="text-zinc-400">—</span>
                      )}
                    </td>
                  )}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/stats/${entry.player_name}?r=${entry.region.toLowerCase()}`}
                        target="_blank"
                        className="text-blue-300 hover:text-blue-500 hover:underline font-semibold transition-colors cursor-pointer"
                      >
                        {entry.player_name}
                      </Link>
                      <SocialIndicators playerName={entry.player_name} channelData={channelData} />
                      {region === 'all' && (
                        <span className="text-sm text-gray-400">({entry.region})</span>
                      )}
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