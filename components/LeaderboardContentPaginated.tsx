'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ColumnDef,
  SortingState,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { DateTime } from 'luxon';
import {
  ChevronsLeft,
  ChevronsRight,
  ChevronLeft,
  ChevronRight,
  ChevronsUpDown,
  Info,
  Search,
  X,
} from 'lucide-react';

import DatePicker from './DatePicker';
import SocialIndicators from './SocialIndicators';
import { Button } from '@/components/ui/button';
import { ButtonGroup, ButtonGroupText } from '@/components/ui/button-group';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { cn } from '@/lib/utils';
import { getLeaderboardDateRange } from '@/utils/dateUtils';
import { inMemoryCache } from '@/utils/inMemoryCache';
import { supabase } from '@/utils/supabaseClient';
import { toNewUrlParams } from '@/utils/urlParams';

type Timeframe = 'day' | 'week';
type Mode = 'solo' | 'duo';

interface LeaderboardEntry {
  player_id?: string;
  player_name: string;
  rating: number;
  rank: number;
  region: string;
  games_played: number;
  rating_delta: number;
  rank_delta: number;
  placement?: number | null;
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
  day_avg?: number | null;
  weekly_avg?: number | null;
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

interface FetchContext {
  region: string;
  mode: Mode;
  timeframe: Timeframe;
  dateOffset: number;
  pageIndex: number;
  pageSize: number;
  search: string;
}

interface FetchResult {
  entries: LeaderboardEntry[];
  totalRows: number;
}

const PAGE_SIZE = 50;
const CACHE_TTL_MS = 5 * 60 * 1000;
const regions = ['na', 'eu', 'ap', 'cn'] as const;
const regionNames = {
  na: 'Americas',
  eu: 'Europe',
  ap: 'Asia Pacific',
  cn: 'China',
  all: 'Global',
} as const;

function formatDelta(value: number) {
  if (value > 0) return <span className="text-green-400">+{value}</span>;
  if (value < 0) return <span className="text-red-400">{value}</span>;
  return <span className="text-muted-foreground">-</span>;
}

function getCacheKey(context: FetchContext) {
  return [
    'leaderboard-page',
    context.region,
    context.mode,
    context.timeframe,
    context.dateOffset,
    context.pageIndex,
    context.pageSize,
    context.search.trim().toLowerCase(),
  ].join(':');
}

function getPageCount(totalRows: number) {
  return Math.max(1, Math.ceil(totalRows / PAGE_SIZE));
}

export default function LeaderboardContentPaginated({ region, defaultSolo = true }: Props) {
  const router = useRouter();
  const ptNow = useMemo(() => DateTime.now().setZone('America/Los_Angeles').startOf('day'), []);
  const [mode, setMode] = useState<Mode>(defaultSolo ? 'solo' : 'duo');
  const [timeframe, setTimeframe] = useState<Timeframe>('day');
  const [selectedDate, setSelectedDate] = useState<DateTime>(ptNow);
  const [dateOffset, setDateOffset] = useState(0);
  const [minDate, setMinDate] = useState<DateTime>(DateTime.now().setZone('America/Los_Angeles').minus({ days: 30 }));
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [channelData, setChannelData] = useState<ChannelEntry[]>([]);
  const [chineseStreamerData, setChineseStreamerData] = useState<ChineseChannelEntry[]>([]);
  const [totalRows, setTotalRows] = useState(0);
  const [pageIndex, setPageIndex] = useState(0);
  const [pageInput, setPageInput] = useState('1');
  const [searchInput, setSearchInput] = useState('');
  const [executedSearch, setExecutedSearch] = useState('');
  const [sorting, setSorting] = useState<SortingState>([{ id: 'rank', desc: false }]);
  const [loading, setLoading] = useState(true);
  const [prefetching, setPrefetching] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showInfo, setShowInfo] = useState(false);
  const [showPlacementInfo, setShowPlacementInfo] = useState(false);

  const pageCount = getPageCount(totalRows);
  const solo = mode === 'solo';
  const gameMode = solo ? '0' : '1';
  const regionName = regionNames[region as keyof typeof regionNames] ?? region.toUpperCase();

  const calculateDateOffset = useCallback((date: DateTime) => {
    const today = ptNow.startOf('day');
    return Math.max(0, Math.round(today.diff(date.startOf('day'), 'days').days));
  }, [ptNow]);

  const handleDateChange = useCallback((date: DateTime) => {
    setSelectedDate(date);
    setDateOffset(calculateDateOffset(date));
    setPageIndex(0);
  }, [calculateDateOffset]);

  const fetchMinDate = useCallback(async () => {
    let query = supabase
      .from('daily_leaderboard_stats')
      .select('day_start')
      .eq('game_mode', gameMode);

    if (region !== 'all') {
      query = query.eq('region', region.toUpperCase());
    }

    const { data, error } = await query.order('day_start', { ascending: true }).limit(1);
    if (!error && data?.[0]?.day_start) {
      setMinDate(DateTime.fromISO(data[0].day_start).setZone('America/Los_Angeles'));
    }
  }, [gameMode, region]);

  const fetchTotalRows = useCallback(async (
    currentStart: string,
    search: string,
  ): Promise<number> => {
    const trimmedSearch = search.trim();
    const numericRank = /^\d+$/.test(trimmedSearch) ? Number(trimmedSearch) : null;

    if (!trimmedSearch && region !== 'all') {
      const { data, error } = await supabase
        .from('daily_leaderboard_stats')
        .select('rank')
        .eq('region', region.toUpperCase())
        .eq('game_mode', gameMode)
        .eq('day_start', currentStart)
        .order('rank', { ascending: false })
        .limit(1);

      if (error) throw error;
      return typeof data?.[0]?.rank === 'number' ? data[0].rank : 0;
    }

    let query = supabase
      .from('daily_leaderboard_stats')
      .select('player_id, players!inner(player_name)', { count: 'exact', head: true })
      .eq('game_mode', gameMode)
      .eq('day_start', currentStart);

    if (region === 'all') {
      query = query.not('region', 'eq', 'CN');
    } else {
      query = query.eq('region', region.toUpperCase());
    }

    if (trimmedSearch) {
      if (numericRank !== null && region !== 'all') {
        query = query.eq('rank', numericRank);
      } else {
        query = query.ilike('players.player_name', `%${trimmedSearch}%`);
      }
    }

    const { count, error } = await query;
    if (error) throw error;
    return count ?? 0;
  }, [gameMode, region]);

  const fetchSocialData = useCallback(async (pageEntries: LeaderboardEntry[]) => {
    const names = Array.from(new Set(pageEntries.map((entry) => entry.player_name)));
    if (names.length === 0) {
      setChannelData([]);
      setChineseStreamerData([]);
      return;
    }

    const [{ data: channels }, { data: chineseStreamers }] = await Promise.all([
      supabase.from('channels').select('player, channel, youtube, live').in('player', names),
      supabase.from('chinese_streamers').select('player, url').in('player', names),
    ]);

    setChannelData((channels ?? []) as ChannelEntry[]);
    setChineseStreamerData((chineseStreamers ?? []) as ChineseChannelEntry[]);
  }, []);

  const fetchLeaderboardPage = useCallback(async (
    context: FetchContext,
    options: { prefetch?: boolean } = {},
  ): Promise<FetchResult> => {
    const cacheKey = getCacheKey(context);
    const cached = inMemoryCache.get<FetchResult>(cacheKey);
    if (cached) return cached;

    const { currentStart, prevStart } = await getLeaderboardDateRange(context.timeframe, context.dateOffset);
    const total = await fetchTotalRows(currentStart, context.search);
    const from = context.pageIndex * context.pageSize;
    const to = from + context.pageSize - 1;
    const trimmedSearch = context.search.trim();
    const numericRank = /^\d+$/.test(trimmedSearch) ? Number(trimmedSearch) : null;

    let query = supabase
      .from('daily_leaderboard_stats')
      .select(`
        player_id,
        rating,
        rank,
        region,
        games_played,
        weekly_games_played,
        day_avg,
        weekly_avg,
        updated_at,
        players!inner(player_name)
      `)
      .eq('game_mode', context.mode === 'solo' ? '0' : '1')
      .eq('day_start', currentStart);

    if (context.region === 'all') {
      query = query.not('region', 'eq', 'CN').order('rating', { ascending: false });
    } else {
      query = query
        .eq('region', context.region.toUpperCase())
        .order('updated_at', { ascending: false })
        .order('rank', { ascending: true });
    }

    if (trimmedSearch) {
      if (numericRank !== null && context.region !== 'all') {
        query = query.eq('rank', numericRank);
      } else {
        query = query.ilike('players.player_name', `%${trimmedSearch}%`);
      }
    }

    const { data, error } = await query.range(from, to);
    if (error) throw error;

    const currentData = ((data ?? []) as unknown[]).map((row, index) => {
      const record = row as {
        player_id?: string;
        rating?: number;
        rank?: number;
        region?: string;
        games_played?: number;
        weekly_games_played?: number;
        day_avg?: number | null;
        weekly_avg?: number | null;
        players?: { player_name?: string };
      };

      return {
        player_id: record.player_id,
        player_name: record.players?.player_name ?? '',
        rating: typeof record.rating === 'number' ? record.rating : 0,
        rank: context.region === 'all'
          ? from + index + 1
          : (typeof record.rank === 'number' ? record.rank : 0),
        region: record.region ?? context.region.toUpperCase(),
        games_played: typeof record.games_played === 'number' ? record.games_played : 0,
        weekly_games_played: typeof record.weekly_games_played === 'number' ? record.weekly_games_played : 0,
        day_avg: typeof record.day_avg === 'number' ? record.day_avg : null,
        weekly_avg: typeof record.weekly_avg === 'number' ? record.weekly_avg : null,
      };
    });

    const playerIds = currentData.map((entry) => entry.player_id).filter(Boolean).sort() as string[];
    let baselineData: RawLeaderboardEntry[] = [];

    if (playerIds.length > 0) {
      let baselineQuery = supabase
        .from('daily_leaderboard_stats')
        .select(`
          player_id,
          rating,
          rank,
          region,
          players!inner(player_name)
        `)
        .eq('game_mode', context.mode === 'solo' ? '0' : '1')
        .eq('day_start', prevStart)
        .in('player_id', playerIds);

      if (context.region === 'all') {
        baselineQuery = baselineQuery.not('region', 'eq', 'CN');
      } else {
        baselineQuery = baselineQuery.eq('region', context.region.toUpperCase());
      }

      const { data: baseline, error: baselineError } = await baselineQuery;
      if (baselineError) throw baselineError;

      baselineData = ((baseline ?? []) as unknown[]).map((row) => {
        const record = row as {
          player_id?: string;
          rating?: number;
          rank?: number;
          region?: string;
          players?: { player_name?: string };
        };

        return {
          player_id: record.player_id,
          player_name: record.players?.player_name ?? '',
          rating: typeof record.rating === 'number' ? record.rating : 0,
          rank: typeof record.rank === 'number' ? record.rank : 0,
          region: record.region ?? context.region.toUpperCase(),
        };
      });
    }

    const baselineByPlayerId = new Map(baselineData.map((entry) => [entry.player_id, entry]));
    const entriesWithDelta = currentData.map((entry) => {
      const baseline = baselineByPlayerId.get(entry.player_id);
      const gamesPlayed = context.timeframe === 'week'
        ? entry.weekly_games_played
        : entry.games_played;
      const startingRating = typeof baseline?.rating === 'number' ? baseline.rating : 0;
      const placement = startingRating > 9000
        ? (context.timeframe === 'day'
          ? (gamesPlayed >= 5 && entry.day_avg != null ? Number(entry.day_avg.toFixed(2)) : null)
          : (gamesPlayed >= 10 && entry.weekly_avg != null ? Number(entry.weekly_avg.toFixed(2)) : null))
        : null;

      return {
        player_id: entry.player_id,
        player_name: entry.player_name,
        rating: entry.rating,
        rank: entry.rank,
        region: entry.region,
        games_played: gamesPlayed,
        rating_delta: typeof baseline?.rating === 'number' ? entry.rating - baseline.rating : 0,
        rank_delta: context.region === 'all' || typeof baseline?.rank !== 'number'
          ? 0
          : baseline.rank - entry.rank,
        placement,
      };
    });

    const result = { entries: entriesWithDelta, totalRows: total };
    inMemoryCache.set(cacheKey, result, CACHE_TTL_MS);

    if (!options.prefetch) {
      await fetchSocialData(entriesWithDelta);
    }

    return result;
  }, [fetchSocialData, fetchTotalRows]);

  const loadPage = useCallback(async (nextPageIndex: number) => {
    const context = {
      region,
      mode,
      timeframe,
      dateOffset,
      pageIndex: nextPageIndex,
      pageSize: PAGE_SIZE,
      search: executedSearch,
    };

    try {
      setLoading(true);
      setErrorMessage(null);
      const result = await fetchLeaderboardPage(context);
      setEntries(result.entries);
      setTotalRows(result.totalRows);
      setPageInput(String(nextPageIndex + 1));

      const nextPage = nextPageIndex + 1;
      if (nextPage < getPageCount(result.totalRows)) {
        setPrefetching(true);
        void fetchLeaderboardPage({ ...context, pageIndex: nextPage }, { prefetch: true })
          .catch((error) => console.warn('Leaderboard prefetch failed:', error))
          .finally(() => setPrefetching(false));
      }
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
      setErrorMessage('Unable to load leaderboard data.');
      setEntries([]);
      setTotalRows(0);
    } finally {
      setLoading(false);
    }
  }, [dateOffset, executedSearch, fetchLeaderboardPage, mode, region, timeframe]);

  useEffect(() => {
    setMode(defaultSolo ? 'solo' : 'duo');
  }, [defaultSolo]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('preferredRegion', region);
      localStorage.setItem('preferredGameMode', mode);
      window.dispatchEvent(new Event('localStorageChange'));
    }
  }, [mode, region]);

  useEffect(() => {
    void fetchMinDate();
  }, [fetchMinDate]);

  useEffect(() => {
    void loadPage(pageIndex);
  }, [loadPage, pageIndex]);

  const handleRegionChange = (nextRegion: string) => {
    if (region === nextRegion) return;
    if (typeof window !== 'undefined') {
      localStorage.setItem('preferredRegion', nextRegion);
    }
    router.push(`/lb/${nextRegion}/${mode}`);
  };

  const handleModeChange = (nextMode: Mode) => {
    setMode(nextMode);
    setPageIndex(0);
    if (typeof window !== 'undefined') {
      localStorage.setItem('preferredGameMode', nextMode);
    }
    router.push(`/lb/${region}/${nextMode}`);
  };

  const executeSearch = () => {
    setExecutedSearch(searchInput.trim());
    setPageIndex(0);
    setSorting([{ id: 'rank', desc: false }]);
  };

  const clearSearch = () => {
    setSearchInput('');
    setExecutedSearch('');
    setPageIndex(0);
  };

  const submitPage = () => {
    const parsed = Number(pageInput);
    if (!Number.isFinite(parsed)) {
      setPageInput(String(pageIndex + 1));
      return;
    }
    const next = Math.min(Math.max(Math.trunc(parsed), 1), pageCount) - 1;
    setPageIndex(next);
    setPageInput(String(next + 1));
  };

  const columns = useMemo<ColumnDef<LeaderboardEntry>[]>(() => {
    const statsUrlFor = (entry: LeaderboardEntry) => {
      const params = toNewUrlParams({
        region: entry.region.toLowerCase(),
        mode,
        view: timeframe,
        date: selectedDate.startOf('day').toISODate(),
      });
      return `/stats/${entry.player_name}?${params.toString()}`;
    };

    const baseColumns: ColumnDef<LeaderboardEntry>[] = [
      {
        accessorKey: 'rank',
        header: 'Rank',
        cell: ({ row }) => <span className="font-medium text-muted-foreground">#{row.original.rank}</span>,
      },
    ];

    if (region !== 'all') {
      baseColumns.push({
        accessorKey: 'rank_delta',
        header: 'Delta Rank',
        cell: ({ row }) => formatDelta(row.original.rank_delta),
      });
    }

    baseColumns.push(
      {
        accessorKey: 'player_name',
        header: 'Player',
        cell: ({ row }) => (
          <div className="flex min-w-40 items-center gap-2">
            <Link
              href={statsUrlFor(row.original)}
              target="_blank"
              prefetch={false}
              className="font-semibold text-link transition-colors hover:text-link-hover hover:underline"
            >
              {row.original.player_name}
            </Link>
            <SocialIndicators
              playerName={row.original.player_name}
              channelData={channelData}
              chineseStreamerData={chineseStreamerData}
            />
            {region === 'all' && (
              <span className="text-xs text-muted-foreground">({row.original.region})</span>
            )}
          </div>
        ),
      },
      {
        accessorKey: 'rating',
        header: 'Rating',
        cell: ({ row }) => <span className="text-base font-semibold text-foreground">{row.original.rating}</span>,
      },
      {
        accessorKey: 'rating_delta',
        header: 'Delta Rating',
        cell: ({ row }) => formatDelta(row.original.rating_delta),
      },
      {
        accessorKey: 'games_played',
        header: 'Games',
        cell: ({ row }) => row.original.games_played,
      },
    );

    if (region !== 'cn') {
      baseColumns.push({
        accessorKey: 'placement',
        header: 'Placement',
        sortingFn: (a, b) => {
          const first = a.original.placement;
          const second = b.original.placement;
          if (first == null && second == null) return 0;
          if (first == null) return 1;
          if (second == null) return -1;
          return first - second;
        },
        cell: ({ row }) => row.original.placement ?? 'N/A',
      });
    }

    return baseColumns;
  }, [channelData, chineseStreamerData, mode, region, selectedDate, timeframe]);

  const table = useReactTable({
    data: entries,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  const leaderboardLink = region === 'cn'
    ? 'https://hs.blizzard.cn/community/leaderboards/'
    : `https://hearthstone.blizzard.com/en-us/community/leaderboards?region=${region.toUpperCase()}&leaderboardId=battlegrounds${solo ? '' : 'duo'}`;

  return (
    <section className="container mx-auto max-w-4xl px-0 py-4 [@media(min-width:431px)]:px-4">
      <div className="flex flex-col gap-5 rounded-lg bg-card px-0 py-5 text-card-foreground [@media(min-width:431px)]:px-5">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="flex flex-wrap items-center justify-center gap-2">
            <h1 className="text-xl font-semibold text-foreground sm:text-2xl">
              {regionName} {regionName === 'Global' && '(No CN)'} Leaderboard
            </h1>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label="Leaderboard information"
              onClick={() => setShowInfo((value) => !value)}
            >
              <Info />
            </Button>
            <DatePicker
              selectedDate={selectedDate}
              onDateChange={handleDateChange}
              maxDate={ptNow.endOf('day')}
              minDate={minDate}
              weekNavigation={timeframe === 'week'}
            />
          </div>

          <div className="flex flex-wrap justify-center gap-4">
            <ToggleGroup
              type="single"
              value={region || 'all'}
              onValueChange={(value) => value && handleRegionChange(value)}
            >
              <ToggleGroupItem value="all">ALL</ToggleGroupItem>
              {regions.map((item) => (
                <ToggleGroupItem key={item} value={item}>
                  {item.toUpperCase()}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>

            <ToggleGroup
              type="single"
              value={mode}
              onValueChange={(value) => {
                if (value === 'solo' || value === 'duo') handleModeChange(value);
              }}
            >
              <ToggleGroupItem value="solo">Solo</ToggleGroupItem>
              <ToggleGroupItem value="duo">Duo</ToggleGroupItem>
            </ToggleGroup>

            <ToggleGroup
              type="single"
              value={timeframe}
              onValueChange={(value) => {
                if (value === 'day' || value === 'week') {
                  setTimeframe(value);
                  setPageIndex(0);
                }
              }}
            >
              <ToggleGroupItem value="day">Day</ToggleGroupItem>
              <ToggleGroupItem value="week">Week</ToggleGroupItem>
            </ToggleGroup>
          </div>
        </div>

        {showInfo && (
          <div className="rounded-md border border-border bg-muted/30 p-4 text-sm text-muted-foreground">
            <p>
              Rankings are fetched from the{' '}
              <a href={leaderboardLink} target="_blank" rel="noopener noreferrer" className="text-link hover:underline">
                official leaderboards
              </a>{' '}
              every 5 minutes. All stats and resets use Pacific Time midnight.
            </p>
            {region === 'cn' && <p className="mt-2">Blizzard CN only updates their leaderboards every hour.</p>}
          </div>
        )}

        <form
          className="flex flex-col gap-2 sm:flex-row"
          onSubmit={(event) => {
            event.preventDefault();
            executeSearch();
          }}
        >
          <div className="relative flex-1">
            <Input
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="Search player name or rank..."
              className="pr-9"
            />
            {searchInput && (
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label="Clear search"
                className="absolute right-2 top-1/2 -translate-y-1/2"
                onClick={clearSearch}
              >
                <X />
              </Button>
            )}
          </div>
          <Button type="submit" size="lg">
            <Search data-icon="inline-start" />
            Search
          </Button>
        </form>

        <div className="flex flex-wrap items-center justify-between gap-3 px-3 text-sm text-muted-foreground [@media(min-width:431px)]:px-0">
          <span>
            {loading ? 'Loading players...' : `Showing ${entries.length} of ${totalRows} players`}
            {executedSearch && ` for "${executedSearch}"`}
          </span>
          <span>{prefetching ? 'Prefetching next page...' : 'Next page ready when cached'}</span>
        </div>

        {solo && region !== 'cn' && showPlacementInfo && (
          <div className="rounded-md border border-border bg-muted/30 p-4 text-sm text-muted-foreground">
            <p>Placement average is shown when starting rating is above 9000 and the player has enough games: 5 for day, 10 for week.</p>
          </div>
        )}

        {errorMessage && (
          <div className="rounded-md border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
            {errorMessage}
          </div>
        )}

        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} hover="none">
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id} className={cn(header.column.id === 'rank' && 'sticky left-0 bg-card')}>
                    <button
                      type="button"
                      className="inline-flex items-center gap-1 whitespace-nowrap"
                      onClick={header.column.getToggleSortingHandler()}
                    >
                      {flexRender(header.column.columnDef.header, header.getContext())}
                      <ChevronsUpDown />
                    </button>
                    {header.column.id === 'placement' && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-xs"
                        aria-label="Placement information"
                        onClick={() => setShowPlacementInfo((value) => !value)}
                      >
                        <Info />
                      </Button>
                    )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow hover="none">
                <TableCell colSpan={columns.length} className="h-32 text-center text-muted-foreground">
                  Loading...
                </TableCell>
              </TableRow>
            ) : table.getRowModel().rows.length > 0 ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={`${row.original.player_name}-${row.original.region}-${row.original.rank}`}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell
                      key={cell.id}
                      className={cn(cell.column.id === 'rank' && 'sticky left-0 bg-card')}
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow hover="none">
                <TableCell colSpan={columns.length} className="h-32 text-center text-muted-foreground">
                  No results found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>

        <div className="flex flex-col items-center justify-between gap-3 px-3 sm:flex-row [@media(min-width:431px)]:px-0">
          <ButtonGroup>
            <Button
              type="button"
              variant="outline"
              size="icon"
              aria-label="First page"
              disabled={pageIndex === 0 || loading}
              onClick={() => setPageIndex(0)}
            >
              <ChevronsLeft />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="icon"
              aria-label="Previous page"
              disabled={pageIndex === 0 || loading}
              onClick={() => setPageIndex((value) => Math.max(0, value - 1))}
            >
              <ChevronLeft />
            </Button>
            <ButtonGroupText>
              Page {pageIndex + 1} of {pageCount}
            </ButtonGroupText>
            <Button
              type="button"
              variant="outline"
              size="icon"
              aria-label="Next page"
              disabled={pageIndex >= pageCount - 1 || loading}
              onClick={() => setPageIndex((value) => Math.min(pageCount - 1, value + 1))}
            >
              <ChevronRight />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="icon"
              aria-label="Last page"
              disabled={pageIndex >= pageCount - 1 || loading}
              onClick={() => setPageIndex(pageCount - 1)}
            >
              <ChevronsRight />
            </Button>
          </ButtonGroup>

          <form
            className="flex items-center gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              submitPage();
            }}
          >
            <Input
              aria-label="Page number"
              inputMode="numeric"
              value={pageInput}
              onChange={(event) => setPageInput(event.target.value)}
              className="h-8 w-20"
            />
            <Button type="submit" variant="outline" disabled={loading}>
              Go
            </Button>
          </form>
        </div>
      </div>
    </section>
  );
}
