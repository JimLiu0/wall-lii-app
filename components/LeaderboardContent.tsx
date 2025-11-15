'use client';

import { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import { supabase } from '@/utils/supabaseClient';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

import ButtonGroup from './ButtonGroup';
import SocialIndicators from './SocialIndicators';
import DatePicker from './DatePicker';
import { getLeaderboardDateRange } from '@/utils/dateUtils';
import { Info, X } from 'lucide-react';
import { inMemoryCache } from '@/utils/inMemoryCache';
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
  player_id?: string;
  player_name: string;
  rating: number;
  rank: number;
  region: string;
  games_played?: number;
  weekly_games_played?: number;
  rating_delta?: number;
}



interface ChannelEntry {
  channel: string;
  player: string;
  live: boolean;
  youtube?: string;
}

interface ChineseChannelEntry {
  player: string;
  url: string;
}

interface Props {
  region: string;
  defaultSolo?: boolean;
}


const MAX_ROWS = 1000; // hard cap; we only ever surface top 1000
const regions = ['na', 'eu', 'ap', 'cn'] as const;

export default function LeaderboardContent({ region, defaultSolo = true }: Props) {
  const router = useRouter();
  const ptNow = DateTime.now().setZone('America/Los_Angeles').startOf('day');
  const [leaderboardData, setLeaderboardData] = useState<LeaderboardEntry[]>([]);
  const [channelData, setChannelData] = useState<ChannelEntry[]>([]);
  const [chineseStreamerData, setChineseStreamerData] = useState<ChineseChannelEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [currentOffset, setCurrentOffset] = useState(0);
  const [hasMoreData, setHasMoreData] = useState(true);
  const [isLoadingAll, setIsLoadingAll] = useState(false);
  const [solo, setSolo] = useState(() => {
    // Use defaultSolo prop which comes from the route params (source of truth)
    // Route params always take precedence over localStorage
    return defaultSolo;
  });
  const [searchQuery, setSearchQuery] = useState('');
  const observerTarget = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const [sortColumn, setSortColumn] = useState<'rank' | 'rank_delta' | 'rating' | 'rating_delta' | 'games_played' | 'player_name'>('rank');
  const [sortAsc, setSortAsc] = useState(true);
  const [timeframe, setTimeframe] = useState<'day' | 'week'>('day');
  const [showInfoModal, setShowInfoModal] = useState(false);

  const [dateOffset, setDateOffset] = useState(0);
  const [selectedDate, setSelectedDate] = useState<DateTime>(ptNow);
  const [minDate, setMinDate] = useState<DateTime>(DateTime.now().minus({ days: 30 }));

  // Memoize the Info icon click handler to prevent unnecessary re-renders
  const handleInfoClick = useCallback(() => {
    setShowInfoModal(prev => !prev);
  }, []);

  // Calculate offset based on selected date
  const calculateDateOffset = useCallback((date: DateTime) => {
    const today = ptNow.startOf('day');
    const selectedDay = date.startOf('day');
    const diff = today.diff(selectedDay, 'days').days;
    return Math.round(diff);
  }, [ptNow]);

  // Handle date change
  const handleDateChange = useCallback((date: DateTime) => {
    setSelectedDate(date);
    const offset = calculateDateOffset(date);
    setDateOffset(offset);
  }, [calculateDateOffset]);

  // Sync solo state with defaultSolo prop (from route params)
  useEffect(() => {
    setSolo(defaultSolo);
  }, [defaultSolo]);

  // Save preferences to localStorage when they change
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('preferredRegion', region);
      localStorage.setItem('preferredGameMode', solo ? 'solo' : 'duo');
      
      // Dispatch custom event to notify other components in the same tab
      window.dispatchEvent(new Event('localStorageChange'));
    }
  }, [region, solo]);


  const fetchLeaderboard = useCallback(async (offset: number = 0, limit: number = 100, append: boolean = false) => {
    const cacheKey = `leaderboard:${region}:${solo ? 'solo' : 'duo'}:${timeframe}:${dateOffset}:${offset}:${limit}`;
    const cachedEntries = inMemoryCache.get<LeaderboardEntry[]>(cacheKey);
    
    if (cachedEntries) {
      if (append) {
        setLeaderboardData(prev => [...prev, ...cachedEntries]);
      } else {
        setLeaderboardData(cachedEntries);
      }
      setLoading(false);
      setLoadingMore(false);
      setHasMoreData(cachedEntries.length === limit && (offset + cachedEntries.length) < MAX_ROWS);
      return;
    }

    try {
      if (offset === 0) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }

      const { currentStart, prevStart, isUsingFallback } = await getLeaderboardDateRange(timeframe, dateOffset);

      // Set min date for date picker
      let query = supabase
        .from('daily_leaderboard_stats')
        .select('day_start')
        .eq('game_mode', solo ? '0': '1');
        
      if (region !== 'all') {
        query = query.eq('region', region.toUpperCase());
      }
        
      const { data: fetched, error } = await query
        .order('day_start', { ascending: true })
        .limit(1);

      if (error) {
        console.error('Error fetching min date:', error);
        setMinDate(DateTime.now().setZone('America/Los_Angeles').minus({ days: 30 }));
      } else if (fetched && Array.isArray(fetched) && fetched.length > 0 && fetched[0]?.day_start) {
        const minDateFromDB = DateTime.fromISO(fetched[0].day_start).setZone('America/Los_Angeles');
        setMinDate(minDateFromDB);
      } else {
        setMinDate(DateTime.now().setZone('America/Los_Angeles').minus({ days: 30 }));
      }

      if (isUsingFallback) {
        console.log('Using fallback data (yesterday) for leaderboard - today\'s data not yet available');
      }

      const mode = solo ? '0' : '1';
      let entries: LeaderboardEntry[] = [];

      if (region === 'all') {
        // Global leaderboard logic
        const currentCacheKey = `lb-current:all:${mode}:${currentStart}:${dateOffset}:${offset}:${limit}`;
        let currentData = inMemoryCache.get<RawLeaderboardEntry[]>(currentCacheKey);
        
        if (!currentData) {
          const { data: fetched, error } = await supabase
            .from('daily_leaderboard_stats')
            .select(`
              player_id,
              rating, 
              region, 
              games_played, 
              weekly_games_played,
              players!inner(player_name)
            `)
            .eq('day_start', currentStart)
            .eq('game_mode', mode)
            .not('region', 'eq', 'CN')
            .order('rating', { ascending: false })
            .range(offset, offset + limit - 1);
          
          if (error) throw error;
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          currentData = (fetched || []).map((row: any, index) => ({
            player_id: row.player_id,
            player_name: row.players.player_name,
            rating: typeof row.rating === 'number' ? row.rating : 0,
            rank: offset + index + 1,
            region: row.region,
            games_played: typeof row.games_played === 'number' ? row.games_played : 0,
            weekly_games_played: typeof row.weekly_games_played === 'number' ? row.weekly_games_played : 0,
          }));
          inMemoryCache.set(currentCacheKey, currentData, 5 * 60 * 1000);
        }

        // Get baseline data for deltas (fetching by player_id instead of range)
        const playerIds = currentData.map((p: RawLeaderboardEntry) => p.player_id).filter(Boolean).sort();
        const baselineCacheKey = `lb-baseline:all:${mode}:${prevStart}:${currentStart}:${playerIds.join(',')}`;
        let baselineData = inMemoryCache.get<RawLeaderboardEntry[]>(baselineCacheKey);
        
        if (!baselineData && playerIds.length > 0) {
          const { data: fetched, error } = await supabase
            .from('daily_leaderboard_stats')
            .select(`
              player_id,
              rating, 
              region,
              players!inner(player_name)
            `)
            .eq('day_start', prevStart)
            .eq('game_mode', mode)
            .not('region', 'eq', 'CN')
            .in('player_id', playerIds);
          
          if (error) throw error;
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          baselineData = (fetched || []).map((row: any) => ({
            player_id: row.player_id,
            player_name: row.players.player_name,
            rating: row.rating,
            rank: 0, // Don't need rank for baseline when comparing all
            region: row.region,
            games_played: 0,
            weekly_games_played: 0,
          }));
          inMemoryCache.set(baselineCacheKey, baselineData, 5 * 60 * 1000);
        } else if (!baselineData) {
          baselineData = [];
        }

        // Calculate deltas - match by player_id when available
        const prevMap = Object.fromEntries(
          baselineData.map(p => [p.player_name, typeof p.rating === 'number' ? p.rating : 0])
        );
        
        const dataWithDelta = currentData.map(p => ({
          player_name: p.player_name,
          rating: typeof p.rating === 'number' ? p.rating : 0,
          rank: typeof p.rank === 'number' ? p.rank : 0,
          region: p.region,
          games_played: timeframe === 'week' ? (typeof p.weekly_games_played === 'number' ? p.weekly_games_played : 0) : (typeof p.games_played === 'number' ? p.games_played : 0),
          rating_delta: typeof prevMap[p.player_name] === 'number'
            ? (typeof p.rating === 'number' ? p.rating - prevMap[p.player_name] : 0)
            : 0,
          rank_delta: 0,
        }));

        entries = dataWithDelta;
      } else {
        // Single-region logic
        const currentCacheKey = `lb-current:${region}:${mode}:${currentStart}:${dateOffset}:${offset}:${limit}`;
        let resultData = inMemoryCache.get<RawLeaderboardEntry[]>(currentCacheKey);
        
        if (!resultData) {
          const result = await supabase
            .from('daily_leaderboard_stats')
            .select(`
              player_id,
              rating, 
              rank, 
              region, 
              games_played, 
              weekly_games_played,
              updated_at,
              players!inner(player_name)
            `)
            .eq('region', region.toUpperCase())
            .eq('game_mode', solo ? '0' : '1')
            .eq('day_start', currentStart)
            .order('updated_at', { ascending: false })
            .order('rank', { ascending: true })
            .range(offset, offset + limit - 1);
          
          if (result.error) {
            console.error('Error fetching leaderboard:', result.error);
            throw result.error;
          }
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          resultData = (result.data || []).map((row: any) => ({
            player_id: row.player_id,
            player_name: row.players.player_name,
            rating: row.rating,
            rank: typeof row.rank === 'number' ? row.rank : 0,
            region: row.region ?? region.toUpperCase(),
            games_played: typeof row.games_played === 'number' ? row.games_played : 0,
            weekly_games_played: typeof row.weekly_games_played === 'number' ? row.weekly_games_played : 0,
          }));
          inMemoryCache.set(currentCacheKey, resultData, 5 * 60 * 1000);
        }

        // Get baseline data for deltas (fetching by player_id instead of range)
        const playerIds = resultData.map((p: RawLeaderboardEntry) => p.player_id).filter(Boolean).sort();
        const baselineCacheKey = `lb-baseline:${region}:${mode}:${prevStart}:${currentStart}:${playerIds.join(',')}`;
        let baselineResults = inMemoryCache.get<RawLeaderboardEntry[]>(baselineCacheKey);
        
        if (!baselineResults && playerIds.length > 0) {
          const { data: fetched } = await supabase
            .from('daily_leaderboard_stats')
            .select(`
              player_id,
              rating, 
              rank, 
              region,
              updated_at,
              players!inner(player_name)
            `)
            .eq('region', region.toUpperCase())
            .eq('game_mode', solo ? '0' : '1')
            .eq('day_start', prevStart)
            .in('player_id', playerIds);
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          baselineResults = (fetched || []).map((row: any) => ({
            player_id: row.player_id,
            player_name: row.players.player_name,
            rating: row.rating,
            rank: typeof row.rank === 'number' ? row.rank : 0,
            region: row.region ?? region.toUpperCase(),
            games_played: 0,
            weekly_games_played: 0,
          }));
          inMemoryCache.set(baselineCacheKey, baselineResults, 5 * 60 * 1000);
        } else if (!baselineResults) {
          baselineResults = [];
        }

        const yesterMap = Object.fromEntries(
          baselineResults.map(e => [e.player_name, e])
        );
        
        type RawLeaderboardEntryWithWeekly = RawLeaderboardEntry & { weekly_games_played?: number };
        entries = resultData.map((p: RawLeaderboardEntryWithWeekly) => {
          const y = yesterMap[p.player_name] || { rating: p.rating, rank: p.rank };
          return {
            ...p,
            games_played: timeframe === 'week'
              ? (p.weekly_games_played ?? 0)
              : (p.games_played ?? 0),
            rating_delta: typeof y.rating === 'number'
              ? (typeof p.rating === 'number' ? p.rating - y.rating : 0)
              : 0,
            rank_delta: typeof y.rank === 'number'
              ? (typeof p.rank === 'number' ? y.rank - p.rank : 0)
              : 0,
          } as LeaderboardEntry;
        });
      }

      // Fetch channels matching just these players (client-side join by name)
      try {
        const names = Array.from(new Set(entries.map(e => e.player_name)));
        if (names.length > 0) {
          const { data: channelsForPage, error: chErr } = await supabase
            .from('channels')
            .select('player, channel, youtube, live')
            .in('player', names);
          if (!chErr && channelsForPage) {
            setChannelData(prev => [...prev, ...(channelsForPage as ChannelEntry[])]);
          }
        } else {
          setChannelData([]);
        }
      } catch (e) {
        // Non-fatal: if channel lookup fails, we still render leaderboard
        console.warn('Channel join lookup failed:', e);
      }
      // Fetch Chinese streamers matching these players (client-side join by name)
      try {
        const names = Array.from(new Set(entries.map(e => e.player_name)));
        if (names.length > 0) {
          const { data: cnForPage, error: cnErr } = await supabase
            .from('chinese_streamers')
            .select('player, url')
            .in('player', names);
          if (!cnErr && cnForPage) {
            setChineseStreamerData(prev => [...prev, ...(cnForPage as ChineseChannelEntry[])]);
          }
        } else {
          setChineseStreamerData([]);
        }
      } catch (e) {
        console.warn('Chinese streamer join lookup failed:', e);
      }
      if (append) {
        setLeaderboardData(prev => [...prev, ...entries]);
      } else {
        setLeaderboardData(entries);
      }
      
      inMemoryCache.set(cacheKey, entries, 5 * 60 * 1000);
      setHasMoreData(entries.length === limit && (offset + entries.length) < MAX_ROWS);
    } 
    catch (error) {
      console.error('Error fetching leaderboard:', error);
      throw error;
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [region, solo, timeframe, dateOffset]);

  // Fetch data when any relevant parameter changes
  useEffect(() => {
    // Reset previous data and fetch state when parameters change
    setLeaderboardData([]);
    setCurrentOffset(0);
    setHasMoreData(true);
    setLoading(true);
    void fetchLeaderboard(0, 100, false);
  }, [region, solo, timeframe, dateOffset, fetchLeaderboard]);

  // Handle region button clicks
  const handleRegionChange = (newRegion: string) => {
    if (region !== newRegion) {
      if (typeof window !== 'undefined') {
        localStorage.setItem('preferredRegion', newRegion);
      }
      // Preserve the current game mode in the URL
      const gameMode = solo ? 'solo' : 'duo';
      const url = `/lb/${newRegion}/${gameMode}`;
      router.push(url);
    }
  };

  // Handle game mode changes
  const handleGameModeChange = (isSolo: boolean) => {
    setSolo(isSolo);
    if (typeof window !== 'undefined') {
      localStorage.setItem('preferredGameMode', isSolo ? 'solo' : 'duo');
    }
    // Update URL with current game mode
    const gameMode = isSolo ? 'solo' : 'duo';
    const url = `/lb/${region}/${gameMode}`;
    router.push(url);
  };

  // Load more data function
  const loadMoreData = useCallback(async () => {
    if (loadingMore || !hasMoreData) return;

    // next page start
    const nextOffset = currentOffset + 100;
    if (nextOffset >= MAX_ROWS) {
      setHasMoreData(false);
      return;
    }

    setCurrentOffset(nextOffset);
    const remaining = Math.min(100, MAX_ROWS - nextOffset);
    await fetchLeaderboard(nextOffset, remaining, true);
  }, [loadingMore, hasMoreData, currentOffset, fetchLeaderboard]);

  // Load all remaining data function
  const loadAllData = useCallback(async () => {
    if (isLoadingAll || !hasMoreData) return;

    const nextOffset = currentOffset + 100;
    const remaining = Math.max(0, MAX_ROWS - nextOffset);
    if (remaining === 0) {
      setHasMoreData(false);
      return;
    }

    setIsLoadingAll(true);
    try {
      await fetchLeaderboard(nextOffset, remaining, true);
      setCurrentOffset(nextOffset);
      // If we asked for all remaining up to MAX_ROWS, we're done regardless of server page size.
      setHasMoreData(false);
    } finally {
      setIsLoadingAll(false);
    }
  }, [isLoadingAll, hasMoreData, currentOffset, fetchLeaderboard]);

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

  // Infinite scroll observer (load more data)
  useEffect(() => {
    if (loading) return;

    // Use rootMargin to trigger preloading before the sentinel enters the viewport
    const observer = new IntersectionObserver(
      (entries) => {
        if (
          entries[0].isIntersecting &&
          !loadingMore &&
          !searchQuery &&
          hasMoreData
        ) {
          void loadMoreData();
        }
      },
      {
        threshold: 0,
        rootMargin: '0px 0px 1200px 0px',
      }
    );

    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }

    return () => observer.disconnect();
  }, [loading, loadingMore, hasMoreData, searchQuery, loadMoreData]);

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
    : `https://hearthstone.blizzard.com/en-us/community/leaderboards?region=${region.toLocaleUpperCase()}&leaderboardId=battlegrounds${solo ? '' : 'duo'}`;
  const regionName = regionNames[region as keyof typeof regionNames];

  return (
    <div className="container mx-auto py-4 px-0 max-w-4xl [@media(min-width:431px)]:px-4">
      <div className="bg-gray-900 rounded-lg py-6 px-0 [@media(min-width:431px)]:px-6">
        {/* Info row */}
        <div className="flex items-center justify-center mb-2 text-center">
          <h1 className="text-xl sm:text-2xl font-semibold text-white flex items-center gap-2 flex-wrap justify-center">
            {regionName} {regionName == 'Global' && '(No CN)'} Leaderboard
            <Info onClick={handleInfoClick} className='text-blue-400 hover:text-blue-300 cursor-pointer' />
            <DatePicker
              selectedDate={selectedDate}
              onDateChange={handleDateChange}
              maxDate={ptNow.endOf('day')}
              minDate={minDate}
              weekNavigation={timeframe=='week'}
            />
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
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-2 bg-gray-800 text-white rounded-lg border border-gray-700 focus:outline-none focus:border-blue-500 transition-colors"
            ref={searchInputRef}
          />
          {/* Results count and clear button */}
          {searchQuery && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
              <span className="text-gray-400 text-sm">
                {filteredData.length} result{filteredData.length !== 1 ? 's' : ''}
              </span>
              <button
                type="button"
                aria-label="Clear search"
                className="p-1 rounded-full hover:bg-gray-700 text-gray-400 hover:text-white transition-colors"
                onClick={() => {
                  setSearchQuery('');
                  setTimeout(() => searchInputRef.current?.focus(), 0);
                }}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        {/* Data loading status and controls */}
        {!loading && leaderboardData.length > 0 && (
          <div className="mb-4 flex flex-col sm:flex-row items-center justify-between gap-2 text-sm text-gray-400">
            <div className="flex items-center gap-2">
              <span>Showing {leaderboardData.length} players</span>
              {hasMoreData && (
                <span className="text-gray-500">(up to {MAX_ROWS} available)</span>
              )}
            </div>
            {hasMoreData && leaderboardData.length < MAX_ROWS && (
              <button
                onClick={loadAllData}
                disabled={isLoadingAll}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors text-sm font-medium"
              >
                {isLoadingAll ? 'Loading All...' : 'Load All Players'}
              </button>
            )}
          </div>
        )}

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
                      }}>
                    Rank{sortColumn === 'rank' ? (sortAsc ? ' ▲' : ' ▼') : ''}
                  </th>
                  {region !== 'all' && (
                    <th className="px-4 py-2 text-left cursor-pointer hidden sm:table-cell"
                        onClick={() => {
                          if (sortColumn === 'rank_delta') setSortAsc(!sortAsc);
                          else { setSortColumn('rank_delta'); setSortAsc(false); }
                        }}>
                      ΔRank{sortColumn === 'rank_delta' ? (sortAsc ? ' ▲' : ' ▼') : ''}
                    </th>
                  )}
                  <th className="px-4 py-2 text-left cursor-pointer"
                      onClick={() => {
                        if (sortColumn === 'player_name') setSortAsc(!sortAsc);
                        else { setSortColumn('player_name'); setSortAsc(true); }
                      }}>
                    Player{sortColumn === 'player_name' ? (sortAsc ? ' ▲' : ' ▼') : ''}
                  </th>
                  <th className="px-4 py-2 text-left cursor-pointer"
                      onClick={() => {
                        if (sortColumn === 'rating') setSortAsc(!sortAsc);
                        else { setSortColumn('rating'); setSortAsc(true); }
                      }}>
                    Rating{sortColumn === 'rating' ? (sortAsc ? ' ▲' : ' ▼') : ''}
                  </th>
                  {region !== 'all' && (
                    <th className="px-4 py-2 text-left cursor-pointer table-cell sm:hidden"
                        onClick={() => {
                          if (sortColumn === 'rank_delta') setSortAsc(!sortAsc);
                          else { setSortColumn('rank_delta'); setSortAsc(false); }
                        }}>
                      ΔRank{sortColumn === 'rank_delta' ? (sortAsc ? ' ▲' : ' ▼') : ''}
                    </th>
                  )}
                  <th className="px-4 py-2 text-left cursor-pointer"
                      onClick={() => {
                        if (sortColumn === 'rating_delta') setSortAsc(!sortAsc);
                        else { setSortColumn('rating_delta'); setSortAsc(false); }
                      }}>
                    ΔRating{sortColumn === 'rating_delta' ? (sortAsc ? ' ▲' : ' ▼') : ''}
                  </th>
                  <th className="px-4 py-2 text-left cursor-pointer"
                      onClick={() => {
                        if (sortColumn === 'games_played') setSortAsc(!sortAsc);
                        else { setSortColumn('games_played'); setSortAsc(false); }
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
                      <td className="px-4 py-3 text-sm font-medium text-zinc-400 hidden sm:table-cell">
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
                          prefetch={false}
                          className="text-blue-300 hover:text-blue-500 hover:underline font-semibold transition-colors cursor-pointer"
                        >
                          {entry.player_name}
                        </Link>
                        <SocialIndicators playerName={entry.player_name} channelData={channelData} chineseStreamerData={chineseStreamerData}/>
                        {region === 'all' && (
                          <span className="text-sm text-gray-400">({entry.region})</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-left text-lg font-semibold text-white">
                      {entry.rating}
                    </td>
                    {region !== 'all' && (
                      <td className="px-4 py-3 text-sm font-medium text-zinc-400 table-cell sm:hidden">
                        {entry.rank_delta > 0 ? (
                          <span className="text-green-400">+{entry.rank_delta}</span>
                        ) : entry.rank_delta < 0 ? (
                          <span className="text-red-400">{entry.rank_delta}</span>
                        ) : (
                          <span className="text-zinc-400">—</span>
                        )}
                      </td>
                    )}
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
            {hasMoreData && !searchQuery && (
              <div
                ref={observerTarget}
                className="py-8 text-center text-sm font-medium text-zinc-400"
              >
                {loadingMore ? (
                  'Loading more players...'
                ) : (
                  'Scroll to load more players...'
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}