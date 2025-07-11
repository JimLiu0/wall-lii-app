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
  const ptNow = DateTime.now().setZone('America/Los_Angeles').startOf('day');
  const [leaderboardData, setLeaderboardData] = useState<LeaderboardEntry[]>([]);
  const [channelData, setChannelData] = useState<ChannelEntry[]>([]);
  const [chineseStreamerData, setChineseStreamerData] = useState<ChineseChannelEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [renderCount, setRenderCount] = useState(25);
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
  const searchInputRef = useRef<HTMLInputElement>(null);

  const [sortColumn, setSortColumn] = useState<'rank' | 'rank_delta' | 'rating' | 'rating_delta' | 'games_played' | 'player_name'>('rank');
  const [sortAsc, setSortAsc] = useState(true);
  const [timeframe, setTimeframe] = useState<'day' | 'week'>('day');
  const fullFetchedRef = useRef(false);
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

  // Fetch channel data
  const fetchChannelData = useCallback(async () => {
    const cacheKey = 'channels:all';
    let data = inMemoryCache.get<ChannelEntry[]>(cacheKey);
    if (!data) {
      try {
        const { data: fetched, error } = await supabase
          .from('channels')
          .select('channel, player, live, youtube');
        if (error) {
          console.error('Error fetching channel data:', error);
          return;
        }
        data = fetched || [];
        inMemoryCache.set(cacheKey, data, 5 * 60 * 1000);
      } catch (error) {
        console.error('Error fetching channel data:', error);
        return;
      }
    }
    setChannelData(data);
  }, []);

  const fetchChineseChannelData = useCallback(async () => {
    const { data: fetched, error } = await supabase
      .from('chinese_streamers')
      .select('player, url');
    if (error) {
      return;
    }
    setChineseStreamerData(fetched);
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
    void fetchChineseChannelData();
  }, [fetchChannelData, fetchChineseChannelData]);

  const fetchLeaderboard = useCallback(async (limit: number = 100) => {
    const cacheKey = `leaderboard:${region}:${solo ? 'solo' : 'duo'}:${timeframe}:${dateOffset}:${limit}`;
    const entries = inMemoryCache.get<LeaderboardEntry[]>(cacheKey);
    if (entries) {
      setLeaderboardData(entries);
      setLoading(false);
      setLoadingMore(false);
      return;
    }
    if (limit === 1000) {
      if (fullFetchedRef.current) return;
      fullFetchedRef.current = true;
    }
    let data;
    try {
      setLoadingMore(true);

      const { currentStart, prevStart, isUsingFallback } = await getLeaderboardDateRange(timeframe, dateOffset);

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
          // Fall back to default min date (30 days ago)
          setMinDate(DateTime.now().setZone('America/Los_Angeles').minus({ days: 30 }));
        } else if (fetched && Array.isArray(fetched) && fetched.length > 0 && fetched[0]?.day_start) {
          const minDateFromDB = DateTime.fromISO(fetched[0].day_start).setZone('America/Los_Angeles');
          setMinDate(minDateFromDB);
        } else {
          // No data found, fall back to default min date
          setMinDate(DateTime.now().setZone('America/Los_Angeles').minus({ days: 30 }));
        }

      if (isUsingFallback) {
        console.log('Using fallback data (yesterday) for leaderboard - today\'s data not yet available');
      }
      const mode = solo ? '0' : '1';
      let entries: LeaderboardEntry[] = [];
      if (region === 'all') {
        const regionsUpper = regions.map(r => r.toUpperCase());
        let combinedRaw: RawLeaderboardEntry[] = [];
        for (const reg of regionsUpper) {
          // Cache current stats
          const currentCacheKey = `lb-current:${reg}:${mode}:${currentStart}:${dateOffset}:${limit}`;
          let currentChunk = inMemoryCache.get<RawLeaderboardEntry[]>(currentCacheKey);
          if (!currentChunk) {
            const { data: fetched, error } = await supabase
              .from('daily_leaderboard_stats')
              .select('player_name, rating, rank, region, games_played, weekly_games_played')
              .eq('day_start', currentStart)
              .eq('game_mode', mode)
              .eq('region', reg)
              .limit(limit)
              .order('rank', { ascending: true });
            if (error) throw error;
            currentChunk = (fetched || []).map((row) => ({
              player_name: row.player_name,
              rating: typeof row.rating === 'number' ? row.rating : 0,
              rank: typeof row.rank === 'number' ? row.rank : 0,
              region: row.region ?? reg,
              games_played: typeof row.games_played === 'number' ? row.games_played : 0,
              weekly_games_played: typeof row.weekly_games_played === 'number' ? row.weekly_games_played : 0,
            }));
            inMemoryCache.set(currentCacheKey, currentChunk, 5 * 60 * 1000);
          }
          // Cache baseline stats
          const baselineCacheKey = `lb-baseline:${reg}:${mode}:${prevStart}:${dateOffset}:${limit}`;
          let baselineChunk = inMemoryCache.get<RawLeaderboardEntry[]>(baselineCacheKey);
          if (!baselineChunk) {
            const { data: fetched, error } = await supabase
              .from('daily_leaderboard_stats')
              .select('player_name, rating, rank, region')
              .eq('day_start', prevStart)
              .eq('game_mode', mode)
              .eq('region', reg)
              .limit(limit)
              .order('rank', { ascending: true });
            if (error) throw error;
            baselineChunk = (fetched || []).map((row) => ({
              player_name: row.player_name,
              rating: row.rating,
              rank: typeof row.rank === 'number' ? row.rank : 0,
              region: row.region ?? reg,
              games_played: 0,
              weekly_games_played: 0,
            }));
            inMemoryCache.set(baselineCacheKey, baselineChunk, 5 * 60 * 1000);
          }
          const prevMap = Object.fromEntries(
            (baselineChunk || []).map(p => [p.player_name, typeof p.rating === 'number' ? p.rating : 0])
          );
          const chunkWithDelta = (currentChunk || []).map(p => ({
            player_name: p.player_name,
            rating: typeof p.rating === 'number' ? p.rating : 0,
            rank: typeof p.rank === 'number' ? p.rank : 0,
            region: p.region ?? reg,
            games_played: timeframe === 'week' ? (typeof p.weekly_games_played === 'number' ? p.weekly_games_played : 0) : (typeof p.games_played === 'number' ? p.games_played : 0),
            weekly_games_played: typeof p.weekly_games_played === 'number' ? p.weekly_games_played : 0,
            rating_delta: typeof prevMap[p.player_name] === 'number'
              ? (typeof p.rating === 'number' ? p.rating - prevMap[p.player_name] : 0)
              : 0,
          }));
          combinedRaw = combinedRaw.concat(chunkWithDelta);
        }
        const mapped = combinedRaw.map(p => ({
          player_name: p.player_name,
          rating: typeof p.rating === 'number' ? p.rating : 0,
          rank: typeof p.rank === 'number' ? p.rank : 0,
          region: p.region,
          games_played: typeof p.games_played === 'number' ? p.games_played : 0,
          weekly_games_played: typeof p.weekly_games_played === 'number' ? p.weekly_games_played : 0,
          rating_delta: typeof p.rating_delta === 'number' ? p.rating_delta : 0,
          rank_delta: 0,
        }));
        entries = processRanks(mapped).slice(0, limit);
      } else {
        // Single-region logic
        // Cache current period stats
        const currentCacheKey = `lb-current:${region}:${mode}:${currentStart}:${dateOffset}:${limit}`;
        let resultData = inMemoryCache.get<RawLeaderboardEntry[]>(currentCacheKey);
        if (!resultData) {
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
          resultData = (result.data || []).map((row) => ({
            player_name: row.player_name,
            rating: row.rating,
            rank: typeof row.rank === 'number' ? row.rank : 0,
            region: row.region ?? region.toUpperCase(),
            games_played: typeof row.games_played === 'number' ? row.games_played : 0,
            weekly_games_played: typeof row.weekly_games_played === 'number' ? row.weekly_games_played : 0,
          }));
          inMemoryCache.set(currentCacheKey, resultData, 5 * 60 * 1000);
        }
        // Cache baseline stats
        const baselineCacheKey = `lb-baseline:${region}:${mode}:${prevStart}:${dateOffset}:${limit}`;
        let baselineResults = inMemoryCache.get<RawLeaderboardEntry[]>(baselineCacheKey);
        if (!baselineResults) {
          const { data: fetched } = await supabase
            .from('daily_leaderboard_stats')
            .select('player_name, rating, rank, region')
            .eq('region', region.toUpperCase())
            .eq('game_mode', solo ? '0' : '1')
            .eq('day_start', prevStart)
            .order('rank', { ascending: true })
            .limit(limit);
          baselineResults = (fetched || []).map((row) => ({
            player_name: row.player_name,
            rating: row.rating,
            rank: typeof row.rank === 'number' ? row.rank : 0,
            region: row.region ?? region.toUpperCase(),
            games_played: 0,
            weekly_games_played: 0,
          }));
          inMemoryCache.set(baselineCacheKey, baselineResults, 5 * 60 * 1000);
        }
        const yesterMap = Object.fromEntries(
          (baselineResults || []).map(e => [e.player_name, e])
        );
        type RawLeaderboardEntryWithWeekly = RawLeaderboardEntry & { weekly_games_played?: number };
        data = (resultData || []).map((p: RawLeaderboardEntryWithWeekly) => {
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
        entries = data;
      }
      setLeaderboardData(entries);
      inMemoryCache.set(cacheKey, entries, 5 * 60 * 1000);
    } 
    catch (error) {
      console.error('Error fetching leaderboard:', error);
      throw error;
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [region, solo, timeframe, dateOffset]);

  // Refresh data when date offset changes
  useEffect(() => {
    setLoading(true);
    setRenderCount(25);
    fullFetchedRef.current = false;
    void fetchLeaderboard(100);
  }, [dateOffset, timeframe, fetchLeaderboard]);

  // Initial fetch
  useEffect(() => {
    // Reset previous data and fetch state when toggles change
    fullFetchedRef.current = false;
    setLeaderboardData([]);
    setRenderCount(50);
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
          setRenderCount(prev => Math.min(prev + 25, filteredData.length));
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
            <DatePicker
              selectedDate={selectedDate}
              onDateChange={handleDateChange}
              maxDate={ptNow.endOf('day')}
              minDate={minDate}
            />
            <Info onClick={handleInfoClick} className='text-blue-400 hover:text-blue-300 cursor-pointer' />
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
                        <SocialIndicators playerName={entry.player_name} channelData={channelData} chineseStreamerData={chineseStreamerData}/>
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
            {renderCount < filteredData.length && (
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