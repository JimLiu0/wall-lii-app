'use client';

import { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import { supabase } from '@/utils/supabaseClient';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

import ButtonGroup from './ButtonGroup';
import SocialIndicators from './SocialIndicators';
import { getLeaderboardDateRange } from '@/utils/dateUtils';
import { Info } from 'lucide-react';

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
  const [renderCount, setRenderCount] = useState(100);
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
      
      // Get the appropriate date range for leaderboard queries (with fallback)
      const { currentStart, prevStart, isUsingFallback } = await getLeaderboardDateRange(timeframe);
      
      // Simple console log for fallback case
      if (isUsingFallback) {
        console.log('Using fallback data (yesterday) for leaderboard - today\'s data not yet available');
      }
      
      const mode = solo ? '0' : '1';

      let entries: LeaderboardEntry[] = [];

      if (region === 'all') {
        // Fetch top N per region, with rating_delta
        const regionsUpper = regions.map(r => r.toUpperCase());
        let combinedRaw: RawLeaderboardEntry[] = [];
        for (const reg of regionsUpper) {
          // Fetch current stats
          const { data: currentChunk, error: currErr } = await supabase
            .from('daily_leaderboard_stats')
            .select('player_name, rating, region, games_played, weekly_games_played')
            .eq('day_start', currentStart)
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
        // Single-region logic
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
    // Reset previous data and fetch state when toggles change
    fullFetchedRef.current = false;
    setLeaderboardData([]);
    setRenderCount(100);
    setLoading(true);
    void fetchLeaderboard(1000);
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

  // Infinite scroll observer (incremental rendering)
  useEffect(() => {
    if (loading) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (
          entries[0].isIntersecting &&
          !loadingMore &&
          renderCount < filteredData.length
        ) {
          setRenderCount(prev => Math.min(prev + 100, filteredData.length));
        }
      },
      { threshold: 0.1 }
    );

    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }

    return () => observer.disconnect();
  }, [loading, loadingMore, renderCount, filteredData.length]);

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

  return (
    <div className="container mx-auto p-4 max-w-4xl">
      <div className="bg-gray-900 rounded-lg p-6">
        {/* Info row */}
        <div className="flex items-center justify-center mb-2 text-center">
          <h1 className="text-xl sm:text-2xl font-semibold text-white flex items-center gap-2 flex-wrap justify-center">
            {regionName} Leaderboard
            <Info onClick={() => setShowInfoModal(!showInfoModal)} className='text-blue-400 hover:text-blue-300 cursor-pointer' />
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

        { loading && <div className="text-2xl font-bold text-white mb-4 text-center">
          Loading...
        </div> }

        { !loading && filteredData.length === 0 && <div className="text-2xl font-bold text-white mb-4 text-center">
          No results found.
        </div> }

        { filteredData.length > 0 && (
          <div className="overflow-x-auto">
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
                {filteredData.slice(0, renderCount).map((entry) => (
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
            {renderCount < filteredData.length && !searchQuery && (
              <div
                ref={observerTarget}
                className="py-8 text-center text-sm font-medium text-zinc-400"
              >
                {loadingMore ? (
                  'Loading more players...'
                ) : (
                  "If you're seeing this, automatic loading is not working. Please refresh the page."
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}