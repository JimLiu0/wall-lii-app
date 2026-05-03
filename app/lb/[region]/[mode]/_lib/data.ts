import { DateTime } from 'luxon';

import { getLeaderboardDateRange } from '@/utils/dateUtils';
import { inMemoryCache } from '@/utils/inMemoryCache';
import { supabase } from '@/utils/supabaseClient';

export type Timeframe = 'day' | 'week';
export type LeaderboardMode = 'solo' | 'duo';

export interface LeaderboardEntry {
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
  day_avg?: number | null;
  weekly_avg?: number | null;
}

export interface ChannelEntry {
  channel: string;
  player: string;
  live: boolean;
  youtube?: string;
}

export interface ChineseChannelEntry {
  player: string;
  url: string;
}

export interface LeaderboardFetchContext {
  region: string;
  mode: LeaderboardMode;
  timeframe: Timeframe;
  dateOffset: number;
  pageIndex: number;
  pageSize: number;
  search: string;
}

export interface LeaderboardFetchResult {
  entries: LeaderboardEntry[];
  totalRows: number;
}

export interface LeaderboardSocialData {
  channelData: ChannelEntry[];
  chineseStreamerData: ChineseChannelEntry[];
}

export interface InitialLeaderboardState extends LeaderboardFetchResult, LeaderboardSocialData {
  minDate: string | null;
  errorMessage?: string | null;
}

export const PAGE_SIZE = 50;
export const QUERY_CHUNK_SIZE = 100;
export const CACHE_TTL_MS = 5 * 60 * 1000;

export function getLeaderboardCacheKey(context: LeaderboardFetchContext) {
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

export function getLeaderboardPageCount(totalRows: number) {
  return Math.max(1, Math.ceil(totalRows / PAGE_SIZE));
}

export function getLeaderboardDateOffset(date: string | null, fallbackDate = DateTime.now().setZone('America/Los_Angeles').startOf('day')) {
  if (!date) return 0;

  const parsedDate = DateTime.fromISO(date, { zone: 'America/Los_Angeles' }).startOf('day');
  if (!parsedDate.isValid) return 0;

  return Math.max(0, Math.round(fallbackDate.diff(parsedDate, 'days').days));
}

function chunkArray<T>(items: T[], size: number) {
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
}

async function fetchTotalRows(
  region: string,
  gameMode: string,
  currentStart: string,
  search: string,
): Promise<number> {
  const trimmedSearch = search.trim();

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
    query = query.ilike('players.player_name', `%${trimmedSearch}%`);
  }

  const { count, error } = await query;
  if (error) throw error;
  return count ?? 0;
}

export async function fetchLeaderboardMinDate(region: string, mode: LeaderboardMode) {
  let query = supabase
    .from('daily_leaderboard_stats')
    .select('day_start')
    .eq('game_mode', mode === 'solo' ? '0' : '1');

  if (region !== 'all') {
    query = query.eq('region', region.toUpperCase());
  }

  const { data, error } = await query.order('day_start', { ascending: true }).limit(1);
  if (error || !data?.[0]?.day_start) {
    return null;
  }

  return DateTime.fromISO(data[0].day_start).setZone('America/Los_Angeles').toISODate();
}

export async function fetchLeaderboardSocialData(pageEntries: LeaderboardEntry[]): Promise<LeaderboardSocialData> {
  const names = Array.from(new Set(pageEntries.map((entry) => entry.player_name)));
  if (names.length === 0) {
    return {
      channelData: [],
      chineseStreamerData: [],
    };
  }

  const nameChunks = chunkArray(names, QUERY_CHUNK_SIZE);
  const [channelResults, chineseStreamerResults] = await Promise.all([
    Promise.all(nameChunks.map((chunk) => (
      supabase.from('channels').select('player, channel, youtube, live').in('player', chunk)
    ))),
    Promise.all(nameChunks.map((chunk) => (
      supabase.from('chinese_streamers').select('player, url').in('player', chunk)
    ))),
  ]);

  return {
    channelData: channelResults.flatMap((result) => result.data ?? []) as ChannelEntry[],
    chineseStreamerData: chineseStreamerResults.flatMap((result) => result.data ?? []) as ChineseChannelEntry[],
  };
}

export async function fetchLeaderboardPage(context: LeaderboardFetchContext): Promise<LeaderboardFetchResult> {
  const cacheKey = getLeaderboardCacheKey(context);
  const cached = inMemoryCache.get<LeaderboardFetchResult>(cacheKey);
  if (cached) return cached;

  const { currentStart, prevStart } = await getLeaderboardDateRange(context.timeframe, context.dateOffset);
  const gameMode = context.mode === 'solo' ? '0' : '1';
  const total = await fetchTotalRows(context.region, gameMode, currentStart, context.search);
  const from = context.pageIndex * context.pageSize;
  const to = from + context.pageSize - 1;
  const trimmedSearch = context.search.trim();

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
    .eq('game_mode', gameMode)
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
    query = query.ilike('players.player_name', `%${trimmedSearch}%`);
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
    const baselineResults = await Promise.all(chunkArray(playerIds, QUERY_CHUNK_SIZE).map((chunk) => {
      let baselineQuery = supabase
        .from('daily_leaderboard_stats')
        .select(`
          player_id,
          rating,
          rank,
          region,
          players!inner(player_name)
        `)
        .eq('game_mode', gameMode)
        .eq('day_start', prevStart)
        .in('player_id', chunk);

      if (context.region === 'all') {
        baselineQuery = baselineQuery.not('region', 'eq', 'CN');
      } else {
        baselineQuery = baselineQuery.eq('region', context.region.toUpperCase());
      }

      return baselineQuery;
    }));

    const baselineError = baselineResults.find((result) => result.error)?.error;
    if (baselineError) throw baselineError;

    baselineData = baselineResults.flatMap((result) => result.data ?? []).map((row) => {
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
  const entries = currentData.map((entry) => {
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

  const result = { entries, totalRows: total };
  inMemoryCache.set(cacheKey, result, CACHE_TTL_MS);

  return result;
}
