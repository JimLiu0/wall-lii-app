import { PostgrestError } from '@supabase/supabase-js';
import type { Metadata } from 'next';
import { unstable_cache } from 'next/cache';
import { cache } from 'react';
import { getCurrentLeaderboardDate } from '@/utils/dateUtils';
import { fetchProfileHistory, type HistorySelection } from './history';
import { supabase } from '@/utils/supabaseClient';

export type SnapshotPoint = {
  game_mode: string;
  player_name: string;
  region: string;
  snapshot_time: string;
  rating: number;
  id?: string;
};

export interface PlayerData {
  name: string;
  data: SnapshotPoint[];
  playerId: string;
  summarySnapshots: SnapshotPoint[];
  initialSelection: HistorySelection;
  availableModes: {
    regions: string[];
    gameModes: string[];
    defaultRegion: string;
    defaultGameMode: string;
    availableCombos: string[];
  };
  currentRanks: Record<string, number | null>;
}

export interface FetchPlayerSummaryResult {
  playerId: string;
  channelData: { channel: string; player: string; live: boolean; youtube?: string }[];
  chineseStreamerData: { player: string; url: string }[];
  summarySnapshots: SnapshotPoint[];
  currentRanks: Record<string, number | null>;
  error: PostgrestError | null;
}

const UNAVAILABLE_ERROR: PostgrestError = {
  name: 'PostgrestError',
  message: 'Stats temporarily unavailable',
  details: '',
  hint: '',
  code: 'UNAVAILABLE',
};

function emptyUnavailableResult(): FetchPlayerSummaryResult {
  return {
    playerId: '',
    channelData: [],
    chineseStreamerData: [],
    summarySnapshots: [],
    currentRanks: {},
    error: UNAVAILABLE_ERROR,
  };
}

export interface SelectionResolutionInput {
  summarySnapshots: SnapshotPoint[];
  requestedRegion: string;
  requestedView: 'all' | 'week' | 'day';
  requestedGameMode: 'solo' | 'duo';
}

export interface SelectionResolution {
  regions: string[];
  gameModes: string[];
  availableCombos: string[];
  validGameMode: 'solo' | 'duo';
  finalRegion: string;
  finalView: 'all' | 'week' | 'day';
  shouldRedirect: boolean;
}

export async function generatePlayerMetadata(player: string): Promise<Metadata> {
  return {
    title: `${player} - Player Profile`,
    description: `View ${player}'s Hearthstone Battlegrounds player profile, statistics, and MMR history.`,
    alternates: { canonical: `/stats/${encodeURIComponent(player)}` },
    openGraph: {
      title: `${player} - Player Profile`,
      url: `/stats/${encodeURIComponent(player)}`,
      type: 'profile',
    },
  };
}

export async function fetchPlayerSummary(player: string): Promise<FetchPlayerSummaryResult> {
  try {
    return await getCachedPlayerSummary(player);
  } catch (fetchError) {
    console.error('Unexpected error fetching player data:', player, fetchError);
    return emptyUnavailableResult();
  }
}

async function fetchPlayerSummaryUnsafe(player: string): Promise<FetchPlayerSummaryResult> {
  const [channels, chinese, identityResult] = await Promise.all([
    supabase.from('channels').select('channel, player, live, youtube').eq('player', player),
    supabase.from('chinese_streamers').select('player, url').eq('player', player),
    supabase.from('players').select('player_id').eq('player_name', player).maybeSingle(),
  ]);
  const { data: channelData, error: channelError } = channels;
  const { data: chineseStreamerData, error: chineseError } = chinese;
  const { data: identity, error: identityError } = identityResult;
  if (channelError) console.error('Error fetching channel data:', channelError);
  if (chineseError) console.error('Error fetching Chinese streamer data:', chineseError);
  if (identityError) throw identityError;
  const playerId = identity?.player_id;
  if (!playerId) return { ...emptyUnavailableResult(), error: null };

  // At most two rows per region/mode; never scan a player's season into memory.
  const combos = ['NA', 'EU', 'AP', 'CN'].flatMap(region =>
    ['0', '1'].map(gameMode => ({ region, gameMode }))
  );
  const summaries = await Promise.all(combos.map(async ({ region, gameMode }) => {
    const query = () => supabase.from('leaderboard_snapshots')
      .select('rating, snapshot_time, region, game_mode')
      .eq('player_id', playerId).eq('region', region).eq('game_mode', gameMode);
    const latest = await query().order('snapshot_time', { ascending: false }).limit(1);
    if (latest.error) throw latest.error;
    if (!latest.data.length) return [];
    const earliest = await query().order('snapshot_time', { ascending: true }).limit(1);
    if (earliest.error) throw earliest.error;
    return [...earliest.data, ...latest.data].map(row => ({ ...row, player_name: player }));
  }));
  const summarySnapshots = summaries.flat().sort((a, b) => a.snapshot_time.localeCompare(b.snapshot_time));
  const { date: currentDate } = getCurrentLeaderboardDate();
  const { data: ranks, error: rankError } = await supabase.from('daily_leaderboard_stats')
    .select('rank, region, game_mode, updated_at')
    .eq('player_id', playerId).eq('day_start', currentDate)
    .order('updated_at', { ascending: true });
  if (rankError) console.error('Error fetching current ranks:', rankError);
  const currentRanks: Record<string, number | null> = {};
  for (const row of ranks ?? []) currentRanks[`${row.region.toLowerCase()}-${row.game_mode}`] = row.rank;

  return {
    playerId,
    channelData: (channelData || []).map((entry) => ({
      channel: entry.channel,
      player: entry.player,
      live: entry.live,
      ...(entry.youtube ? { youtube: entry.youtube } : {}),
    })),
    chineseStreamerData: chineseStreamerData || [],
    summarySnapshots,
    currentRanks,
    error: null,
  };
}

const getPersistedPlayerSummary = unstable_cache(
  async (player: string) => {
    const result = await fetchPlayerSummaryUnsafe(player);
    if (result.error) {
      throw result.error;
    }
    return result;
  },
  ['player-profile-summary-v2'],
  { revalidate: 5 * 60 },
);

// Deduplicate summary reads within a server render.
const getCachedPlayerSummary = cache(getPersistedPlayerSummary);

// Cache only the requested region/mode/period, not the entire profile history.
export const fetchInitialHistory = unstable_cache(
  (playerId: string, player: string, selection: HistorySelection) =>
    fetchProfileHistory(playerId, player, selection),
  ['player-profile-history-v2'],
  { revalidate: 5 * 60 },
);

export function resolveSelection({
  summarySnapshots,
  requestedRegion,
  requestedView,
  requestedGameMode,
}: SelectionResolutionInput): SelectionResolution {
  const regions = [...new Set(summarySnapshots.map((item) => item.region.toLowerCase()))];
  const gameModes = [...new Set(summarySnapshots.map((item) => item.game_mode))];
  const availableCombos = [...new Set(summarySnapshots.map((item) => `${item.region.toLowerCase()}-${item.game_mode}`))];

  const mostRecentSnapshot = summarySnapshots.reduce<SnapshotPoint | null>((latest, row) =>
    !latest || row.snapshot_time > latest.snapshot_time ? row : latest, null);
  const defaultRegion = mostRecentSnapshot?.region.toLowerCase() || 'na';
  const defaultMode: 'solo' | 'duo' = mostRecentSnapshot?.game_mode === '1' ? 'duo' : 'solo';
  const defaultView = 'day';

  const requestedGameModeEnum = requestedGameMode === 'duo' ? '1' : '0';
  const requestedCombo = `${requestedRegion}-${requestedGameModeEnum}`;

  const validGameMode: 'solo' | 'duo' = (() => {
    if (availableCombos.includes(requestedCombo)) {
      return requestedGameMode;
    }
    const targetRegion = regions.includes(requestedRegion) ? requestedRegion : defaultRegion;
    const hasDuo = availableCombos.includes(`${targetRegion}-1`);
    const hasSolo = availableCombos.includes(`${targetRegion}-0`);

    if (hasDuo && !hasSolo) return 'duo';
    if (hasSolo && !hasDuo) return 'solo';
    return defaultMode;
  })();

  const finalRegion = regions.includes(requestedRegion) ? requestedRegion : defaultRegion;
  const finalView = requestedView || defaultView;
  const shouldRedirect =
    requestedRegion === 'all' ||
    !availableCombos.includes(requestedCombo) ||
    !requestedView ||
    requestedGameMode !== validGameMode;

  return {
    regions,
    gameModes,
    availableCombos,
    validGameMode,
    finalRegion,
    finalView,
    shouldRedirect,
  };
}
