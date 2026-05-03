'use client';

import { useCallback, useEffect, useId, useMemo, useRef, useState, type ComponentProps } from 'react';
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
  ArrowDown,
  ArrowUp,
  Info,
} from 'lucide-react';

import CopyButton from '@/components/shared/CopyButton';
import DatePicker from '@/components/shared/DatePicker';
import SocialIndicators from '@/components/shared/SocialIndicators';
import PlayerSearch from '@/components/shared/PlayerSearch';
import InlineAd from '@/components/ads/InlineAd';
import { Button } from '@/components/ui/button';
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
import { adSlots } from '@/components/ads/adSlots';
import { toNewUrlParams } from '@/utils/urlParams';
import {
  fetchLeaderboardMinDate,
  fetchLeaderboardPage,
  fetchLeaderboardSocialData,
  getLeaderboardDateOffset,
  getLeaderboardPageCount,
  PAGE_SIZE,
  type ChannelEntry,
  type ChineseChannelEntry,
  type InitialLeaderboardState,
  type LeaderboardEntry,
  type LeaderboardFetchContext,
  type LeaderboardMode,
  type Timeframe,
} from '../_lib/data';

interface Props {
  region: string;
  defaultSolo?: boolean;
  initialView?: Timeframe;
  initialDate?: string | null;
  initialState: InitialLeaderboardState;
}

const VIRTUAL_ROW_HEIGHT = 49;
const VIRTUAL_OVERSCAN = 8;
const regions = ['na', 'eu', 'ap', 'cn'] as const;
const regionNames = {
  na: 'Americas',
  eu: 'Europe',
  ap: 'Asia Pacific',
  cn: 'China',
  all: 'Global',
} as const;

function formatDelta(value: number) {
  if (value > 0) return <span className="font-medium text-success">+{value}</span>;
  if (value < 0) return <span className="font-medium text-destructive">{value}</span>;
  return <span className="font-medium text-muted-foreground">—</span>;
}

function getPageCount(totalRows: number) {
  return getLeaderboardPageCount(totalRows);
}

function getInitialSortDesc(columnId: string) {
  return !['rank', 'player_name', 'placement'].includes(columnId);
}

function LeaderboardPaginationBar({
  totalPages,
  pageDraft,
  onPageDraftChange,
  onCommitPageDraft,
  onFirstPage,
  onLastPage,
  onPrev,
  onNext,
  canPrev,
  canNext,
  canFirst,
  canLast,
  disabled,
}: {
  totalPages: number;
  pageDraft: string;
  onPageDraftChange: (value: string) => void;
  onCommitPageDraft: () => void;
  onFirstPage: () => void;
  onLastPage: () => void;
  onPrev: () => void;
  onNext: () => void;
  canPrev: boolean;
  canNext: boolean;
  canFirst: boolean;
  canLast: boolean;
  disabled: boolean;
}) {
  const inputId = useId();

  return (
    <div className="flex flex-wrap items-center justify-center gap-x-1 gap-y-2 text-sm text-muted-foreground">
      <Button
        type="button"
        variant="outline"
        size="icon-lg"
        aria-label="First page"
        onClick={onFirstPage}
        disabled={!canFirst || disabled}
      >
        <ChevronsLeft className="h-4 w-4" aria-hidden />
      </Button>
      <Button
        type="button"
        variant="outline"
        size="icon-lg"
        aria-label="Previous page"
        onClick={onPrev}
        disabled={!canPrev || disabled}
      >
        <ChevronLeft className="h-4 w-4" aria-hidden />
      </Button>

      <span className="flex flex-wrap items-center justify-center gap-2 px-1">
        <span>Page</span>
        <label htmlFor={inputId} className="sr-only">
          Page number (1 to {totalPages})
        </label>
        <Input
          id={inputId}
          type="text"
          inputMode="numeric"
          autoComplete="off"
          value={pageDraft}
          onChange={(event) => onPageDraftChange(event.target.value.replace(/\D/g, ''))}
          onBlur={onCommitPageDraft}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              onCommitPageDraft();
            }
          }}
          disabled={totalPages < 1 || disabled}
          className="h-8 min-h-8 w-14 bg-background px-2 py-1 text-center text-sm text-foreground tabular-nums"
        />
        <span>of {totalPages}</span>
      </span>

      <Button
        type="button"
        variant="outline"
        size="icon-lg"
        aria-label="Next page"
        onClick={onNext}
        disabled={!canNext || disabled}
      >
        <ChevronRight className="h-4 w-4" aria-hidden />
      </Button>
      <Button
        type="button"
        variant="outline"
        size="icon-lg"
        aria-label="Last page"
        onClick={onLastPage}
        disabled={!canLast || disabled}
      >
        <ChevronsRight className="h-4 w-4" aria-hidden />
      </Button>
    </div>
  );
}

function LeaderboardControlsRow({
  summary,
  showPagination,
  paginationBarProps,
  showLoadAll,
  onLoadAll,
  isLoadingAll,
}: {
  summary: string;
  showPagination: boolean;
  paginationBarProps: ComponentProps<typeof LeaderboardPaginationBar>;
  showLoadAll: boolean;
  onLoadAll: () => void;
  isLoadingAll: boolean;
}) {
  return (
    <div className="flex flex-col items-center gap-2 sm:flex-row sm:justify-between">
      {showPagination ? <LeaderboardPaginationBar {...paginationBarProps} /> : <div />}
      <div className="flex flex-col items-center gap-2 sm:flex-row sm:justify-end">
        {showLoadAll && (
          <Button
            type="button"
            variant="outline"
            size="lg"
            onClick={onLoadAll}
            disabled={isLoadingAll}
          >
            {isLoadingAll ? 'Loading all...' : 'Load all'}
          </Button>
        )}
        <span className="text-center text-sm text-muted-foreground sm:text-right">
          {summary}
        </span>
      </div>
    </div>
  );
}

export default function LeaderboardTableClient({
  region,
  defaultSolo = true,
  initialView = 'day',
  initialDate = null,
  initialState,
}: Props) {
  const router = useRouter();
  const tableContainerRef = useRef<HTMLDivElement>(null);
  const hasSkippedInitialLoadRef = useRef(false);
  const ptNow = useMemo(() => DateTime.now().setZone('America/Los_Angeles').startOf('day'), []);
  const [mode, setMode] = useState<LeaderboardMode>(defaultSolo ? 'solo' : 'duo');
  const initialSelectedDate = useMemo(() => {
    if (!initialDate) return ptNow;
    const parsedDate = DateTime.fromISO(initialDate, { zone: 'America/Los_Angeles' }).startOf('day');
    return parsedDate.isValid ? parsedDate : ptNow;
  }, [initialDate, ptNow]);
  const [timeframe, setTimeframe] = useState<Timeframe>(initialView);
  const [selectedDate, setSelectedDate] = useState<DateTime>(initialSelectedDate);
  const [dateOffset, setDateOffset] = useState(() => (
    getLeaderboardDateOffset(initialDate, ptNow)
  ));
  const [minDate, setMinDate] = useState<DateTime>(() => (
    initialState.minDate
      ? DateTime.fromISO(initialState.minDate, { zone: 'America/Los_Angeles' })
      : DateTime.now().setZone('America/Los_Angeles').minus({ days: 30 })
  ));
  const [entries, setEntries] = useState<LeaderboardEntry[]>(initialState.entries);
  const [channelData, setChannelData] = useState<ChannelEntry[]>(initialState.channelData);
  const [chineseStreamerData, setChineseStreamerData] = useState<ChineseChannelEntry[]>(initialState.chineseStreamerData);
  const [totalRows, setTotalRows] = useState(initialState.totalRows);
  const [pageIndex, setPageIndex] = useState(0);
  const [pageInput, setPageInput] = useState('1');
  const [searchInput, setSearchInput] = useState('');
  const [executedSearch, setExecutedSearch] = useState('');
  const [sorting, setSorting] = useState<SortingState>([{ id: 'rank', desc: false }]);
  const [loading, setLoading] = useState(false);
  const [loadingAll, setLoadingAll] = useState(false);
  const [allRowsLoaded, setAllRowsLoaded] = useState(false);
  const [virtualWindow, setVirtualWindow] = useState({ start: 0, count: 0 });
  const [errorMessage, setErrorMessage] = useState<string | null>(initialState.errorMessage ?? null);
  const [showInfo, setShowInfo] = useState(false);

  const pageCount = getPageCount(totalRows);
  const solo = mode === 'solo';
  const regionName = regionNames[region as keyof typeof regionNames] ?? region.toUpperCase();
  const selectedDateParam = selectedDate.startOf('day').toISODate();
  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://wallii.gg';
  const leaderboardUrl = `${origin}/lb/${region}/${mode}`;
  const leaderboardViewPathFor = useCallback((
    nextRegion = region,
    nextMode = mode,
    nextTimeframe = timeframe,
    nextDate = selectedDateParam,
  ) => {
    const params = new URLSearchParams({
      view: nextTimeframe,
    });

    if (nextDate) {
      params.set('date', nextDate);
    }

    return `/lb/${nextRegion}/${nextMode}?${params.toString()}`;
  }, [mode, region, selectedDateParam, timeframe]);
  const currentViewUrl = useMemo(() => (
    `${origin}${leaderboardViewPathFor(region, mode, timeframe, selectedDateParam)}`
  ), [leaderboardViewPathFor, mode, origin, region, selectedDateParam, timeframe]);

  const calculateDateOffset = useCallback((date: DateTime) => {
    const today = ptNow.startOf('day');
    return Math.max(0, Math.round(today.diff(date.startOf('day'), 'days').days));
  }, [ptNow]);

  const handleDateChange = useCallback((date: DateTime) => {
    setSelectedDate(date);
    setDateOffset(calculateDateOffset(date));
    setPageIndex(0);
    setAllRowsLoaded(false);
    router.replace(leaderboardViewPathFor(region, mode, timeframe, date.startOf('day').toISODate()), { scroll: false });
  }, [calculateDateOffset, leaderboardViewPathFor, mode, region, router, timeframe]);

  const loadPage = useCallback(async (nextPageIndex: number) => {
    if (allRowsLoaded) return;

    const context: LeaderboardFetchContext = {
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
      const socialData = await fetchLeaderboardSocialData(result.entries);
      setChannelData(socialData.channelData);
      setChineseStreamerData(socialData.chineseStreamerData);

      const nextPage = nextPageIndex + 1;
      if (nextPage < getPageCount(result.totalRows)) {
        void fetchLeaderboardPage({ ...context, pageIndex: nextPage })
          .catch((error) => console.warn('Leaderboard prefetch failed:', error));
      }
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
      setErrorMessage('Unable to load leaderboard data.');
      setEntries([]);
      setTotalRows(0);
    } finally {
      setLoading(false);
    }
  }, [allRowsLoaded, dateOffset, executedSearch, mode, region, timeframe]);

  useEffect(() => {
    setMode(defaultSolo ? 'solo' : 'duo');
  }, [defaultSolo]);

  useEffect(() => {
    setTimeframe(initialView);
  }, [initialView]);

  useEffect(() => {
    setSelectedDate(initialSelectedDate);
    setDateOffset(calculateDateOffset(initialSelectedDate));
  }, [calculateDateOffset, initialSelectedDate]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('preferredRegion', region);
      localStorage.setItem('preferredGameMode', mode);
      window.dispatchEvent(new Event('localStorageChange'));
    }
  }, [mode, region]);

  useEffect(() => {
    void fetchLeaderboardMinDate(region, mode).then((nextMinDate) => {
      if (nextMinDate) {
        setMinDate(DateTime.fromISO(nextMinDate, { zone: 'America/Los_Angeles' }));
      }
    });
  }, [mode, region]);

  useEffect(() => {
    if (!hasSkippedInitialLoadRef.current) {
      hasSkippedInitialLoadRef.current = true;
      return;
    }
    void loadPage(pageIndex);
  }, [loadPage, pageIndex]);

  useEffect(() => {
    setAllRowsLoaded(false);
    setVirtualWindow({ start: 0, count: 0 });
  }, [region, mode, timeframe, dateOffset, executedSearch]);

  useEffect(() => {
    if (!allRowsLoaded) return;

    let frameId = 0;
    const updateVirtualWindow = () => {
      window.cancelAnimationFrame(frameId);
      frameId = window.requestAnimationFrame(() => {
        const tableContainer = tableContainerRef.current;
        if (!tableContainer) return;

        const rect = tableContainer.getBoundingClientRect();
        const tableTop = rect.top + window.scrollY;
        const scrollOffset = Math.max(0, window.scrollY - tableTop);
        const visibleHeight = window.innerHeight;
        const start = Math.max(0, Math.floor(scrollOffset / VIRTUAL_ROW_HEIGHT) - VIRTUAL_OVERSCAN);
        const count = Math.ceil(visibleHeight / VIRTUAL_ROW_HEIGHT) + VIRTUAL_OVERSCAN * 2;

        setVirtualWindow((current) => (
          current.start === start && current.count === count
            ? current
            : { start, count }
        ));
      });
    };

    updateVirtualWindow();
    window.addEventListener('scroll', updateVirtualWindow, { passive: true });
    window.addEventListener('resize', updateVirtualWindow);

    return () => {
      window.cancelAnimationFrame(frameId);
      window.removeEventListener('scroll', updateVirtualWindow);
      window.removeEventListener('resize', updateVirtualWindow);
    };
  }, [allRowsLoaded]);

  const handleRegionChange = (nextRegion: string) => {
    if (region === nextRegion) return;
    if (typeof window !== 'undefined') {
      localStorage.setItem('preferredRegion', nextRegion);
    }
    router.push(leaderboardViewPathFor(nextRegion, mode));
  };

  const handleModeChange = (nextMode: LeaderboardMode) => {
    setMode(nextMode);
    setPageIndex(0);
    setAllRowsLoaded(false);
    if (typeof window !== 'undefined') {
      localStorage.setItem('preferredGameMode', nextMode);
    }
    router.push(leaderboardViewPathFor(region, nextMode));
  };

  const executeSearch = (value: string) => {
    setExecutedSearch(value.trim());
    setPageIndex(0);
    setAllRowsLoaded(false);
    setSorting([{ id: 'rank', desc: false }]);
  };

  const clearSearch = () => {
    setExecutedSearch('');
    setPageIndex(0);
    setAllRowsLoaded(false);
    setSorting([{ id: 'rank', desc: false }]);
  };

  const loadAllRows = useCallback(async () => {
    if (loadingAll || totalRows === 0) return;

    const context: LeaderboardFetchContext = {
      region,
      mode,
      timeframe,
      dateOffset,
      pageIndex: 0,
      pageSize: totalRows,
      search: executedSearch,
    };

    try {
      setLoadingAll(true);
      setLoading(true);
      setErrorMessage(null);
      const result = await fetchLeaderboardPage(context);
      setEntries(result.entries);
      setTotalRows(result.totalRows);
      const socialData = await fetchLeaderboardSocialData(result.entries);
      setChannelData(socialData.channelData);
      setChineseStreamerData(socialData.chineseStreamerData);
      setPageIndex(0);
      setPageInput('1');
      setAllRowsLoaded(true);
      setVirtualWindow({ start: 0, count: 0 });
    } catch (error) {
      console.error('Error loading all leaderboard rows:', error);
      setErrorMessage('Unable to load all leaderboard data.');
    } finally {
      setLoading(false);
      setLoadingAll(false);
    }
  }, [dateOffset, executedSearch, loadingAll, mode, region, timeframe, totalRows]);

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
        meta: {
          variant: 'emphasis',
        },
      },
    ];

    if (region !== 'all') {
      baseColumns.push({
        accessorKey: 'rank_delta',
        header: 'Δ Rank',
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
        meta: {
          variant: 'emphasis',
        },
      },
      {
        accessorKey: 'rating_delta',
        header: 'Δ Rating',
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
    enableMultiSort: false,
    enableSortingRemoval: false,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });
  const tableRows = table.getRowModel().rows;
  const virtualStartIndex = allRowsLoaded
    ? virtualWindow.start
    : 0;
  const virtualVisibleCount = allRowsLoaded
    ? virtualWindow.count
    : tableRows.length;
  const virtualEndIndex = allRowsLoaded
    ? Math.min(tableRows.length, virtualStartIndex + virtualVisibleCount)
    : tableRows.length;
  const visibleRows = allRowsLoaded
    ? tableRows.slice(virtualStartIndex, virtualEndIndex)
    : tableRows;
  const topSpacerHeight = allRowsLoaded ? virtualStartIndex * VIRTUAL_ROW_HEIGHT : 0;
  const bottomSpacerHeight = allRowsLoaded
    ? Math.max(0, (tableRows.length - virtualEndIndex) * VIRTUAL_ROW_HEIGHT)
    : 0;

  const leaderboardLink = region === 'cn'
    ? 'https://hs.blizzard.cn/community/leaderboards/'
    : `https://hearthstone.blizzard.com/en-us/community/leaderboards?region=${region.toUpperCase()}&leaderboardId=battlegrounds${solo ? '' : 'duo'}`;

  const canPrev = pageIndex > 0 && pageCount > 0;
  const canNext = pageCount > 0 && pageIndex < pageCount - 1;
  const paginationBarProps = {
    totalPages: pageCount,
    pageDraft: pageInput,
    onPageDraftChange: setPageInput,
    onCommitPageDraft: submitPage,
    onFirstPage: () => setPageIndex(0),
    onLastPage: () => setPageIndex(pageCount - 1),
    onPrev: () => setPageIndex((value) => Math.max(0, value - 1)),
    onNext: () => setPageIndex((value) => Math.min(pageCount - 1, value + 1)),
    canPrev,
    canNext,
    canFirst: canPrev,
    canLast: canNext,
    disabled: loading,
  };
  const rangeStart = totalRows === 0 ? 0 : pageIndex * PAGE_SIZE + 1;
  const rangeEnd = totalRows === 0 ? 0 : Math.min(pageIndex * PAGE_SIZE + entries.length, totalRows);
  const resultSummary = loading
    ? 'Loading players...'
    : allRowsLoaded
      ? `Showing ${entries.length} players${executedSearch ? ` for "${executedSearch}"` : ''}`
    : totalRows > PAGE_SIZE
      ? `Showing ${rangeStart} to ${rangeEnd} of ${totalRows} players${executedSearch ? ` for "${executedSearch}"` : ''}`
      : `Showing ${totalRows} player${totalRows > 1 ? 's' : ''}`;
  const showPagination = totalRows > 0 && !allRowsLoaded && !loadingAll;
  const showLoadAll = totalRows > PAGE_SIZE && !allRowsLoaded && !loadingAll;
  return (
    <section className="container mx-auto max-w-4xl px-0 py-4 [@media(min-width:431px)]:px-4">
      <div className="flex flex-col gap-5 overflow-hidden rounded-lg bg-card px-0 py-5 text-card-foreground ring-1 ring-foreground/10 [@media(min-width:431px)]:px-5">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="flex flex-wrap items-center justify-center gap-2">
            <h1 className="text-xl font-semibold text-foreground sm:text-2xl">
              {regionName} {regionName === 'Global' && '(No CN)'} Leaderboard
            </h1>
            <Button
              type="button"
              variant="ghost"
              size="icon-lg"
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
                  setAllRowsLoaded(false);
                  router.replace(leaderboardViewPathFor(region, mode, value), { scroll: false });
                }
              }}
            >
              <ToggleGroupItem value="day">Day</ToggleGroupItem>
              <ToggleGroupItem value="week">Week</ToggleGroupItem>
            </ToggleGroup>

            <div className="flex flex-wrap items-center rounded-md border border-border/50 bg-background/30">
              <CopyButton
                text={leaderboardUrl}
                label="Leaderboard"
                ariaLabel="Copy leaderboard URL"
                variant="outline"
                size="lg"
                showCopiedPreview
              />
              <CopyButton
                text={currentViewUrl}
                label="Current View"
                ariaLabel="Copy current leaderboard view URL"
                variant="outline"
                size="lg"
                showCopiedPreview
              />
            </div>
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
            {solo && region !== 'cn' && (
              <p className="mt-2">
                Placement average is shown when starting rating is above 9000 and the player has enough games: 5 for day, 10 for week.
              </p>
            )}
          </div>
        )}

        <PlayerSearch
          value={searchInput}
          onValueChange={setSearchInput}
          onSearch={executeSearch}
          onClear={clearSearch}
          placeholder="Search by player name..."
          disabled={loading}
        />

        {errorMessage && (
          <div className="rounded-md border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
            {errorMessage}
          </div>
        )}

        {totalRows > 0 && (
          <LeaderboardControlsRow
            summary={resultSummary}
            showPagination={showPagination}
            paginationBarProps={paginationBarProps}
            showLoadAll={showLoadAll}
            onLoadAll={loadAllRows}
            isLoadingAll={loadingAll}
          />
        )}

        <div
          ref={tableContainerRef}
        >
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => {
                    const sorted = header.column.getIsSorted();

                    return (
                      <TableHead key={header.id} className="cursor-pointer">
                        <button
                          type="button"
                          className="flex size-full items-center gap-1 text-left whitespace-nowrap cursor-pointer"
                          onClick={() => {
                            const sorted = header.column.getIsSorted();
                            setSorting([{
                              id: header.column.id,
                              desc: sorted ? sorted === 'asc' : getInitialSortDesc(header.column.id),
                            }]);
                          }}
                        >
                          {header.isPlaceholder
                            ? null
                            : flexRender(header.column.columnDef.header, header.getContext())}
                          {sorted === 'asc' && <ArrowUp className="h-3.5 w-3.5" aria-hidden />}
                          {sorted === 'desc' && <ArrowDown className="h-3.5 w-3.5" aria-hidden />}
                        </button>
                      </TableHead>
                    );
                  })}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow hover="none">
                  <TableCell colSpan={columns.length} className="h-32 text-center text-muted-foreground">
                    {loadingAll ? 'Loading all players...' : 'Loading...'}
                  </TableCell>
                </TableRow>
              ) : tableRows.length > 0 ? (
                <>
                  {topSpacerHeight > 0 && (
                    <TableRow hover="none" aria-hidden>
                      <TableCell colSpan={columns.length} className="p-0">
                        <div style={{ height: topSpacerHeight }} />
                      </TableCell>
                    </TableRow>
                  )}
                  {visibleRows.map((row) => (
                    <TableRow key={`${row.original.player_name}-${row.original.region}-${row.original.rank}`}>
                      {row.getVisibleCells().map((cell) => {
                        const meta = cell.column.columnDef.meta as
                          | {
                              variant?: 'default' | 'emphasis';
                              cellClassName?: string | ((row: LeaderboardEntry) => string);
                            }
                          | undefined;
                        const cellClassName =
                          typeof meta?.cellClassName === 'function'
                            ? meta.cellClassName(row.original)
                            : meta?.cellClassName;

                        return (
                          <TableCell
                            key={cell.id}
                            variant={meta?.variant ?? 'default'}
                            className={cellClassName}
                          >
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  ))}
                  {bottomSpacerHeight > 0 && (
                    <TableRow hover="none" aria-hidden>
                      <TableCell colSpan={columns.length} className="p-0">
                        <div style={{ height: bottomSpacerHeight }} />
                      </TableCell>
                    </TableRow>
                  )}
                </>
              ) : (
                <TableRow hover="none">
                  <TableCell colSpan={columns.length} className="h-32 text-center text-muted-foreground">
                    No results found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {totalRows > 0 && (
          <LeaderboardControlsRow
            summary={resultSummary}
            showPagination={showPagination}
            paginationBarProps={paginationBarProps}
            showLoadAll={showLoadAll}
            onLoadAll={loadAllRows}
            isLoadingAll={loadingAll}
          />
        )}

        {!loading && tableRows.length >= 20 && (
          <InlineAd slot={adSlots.inline} tabletAndBelow />
        )}
      </div>
    </section>
  );
}
