import { PostgrestError } from '@supabase/supabase-js';
import type { Metadata } from 'next';
import { getCurrentLeaderboardDate } from '@/utils/dateUtils';
import { getPlayerId } from '@/utils/playerUtils';
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
  availableModes: {
    regions: string[];
    gameModes: string[];
    defaultRegion: string;
    defaultGameMode: string;
    availableCombos: string[];
  };
  currentRanks: Record<string, number | null>;
}

export interface FetchPlayerDataResult {
  channelData: { channel: string; player: string; live: boolean; youtube?: string }[];
  chineseStreamerData: { player: string; url: string }[];
  allData: SnapshotPoint[];
  currentRanks: Record<string, number | null>;
  error: PostgrestError | null;
}

export interface SelectionResolutionInput {
  allData: SnapshotPoint[];
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
  const playerId = await getPlayerId(player);
  if (!playerId) {
    return {
      title: 'Player Not Found',
      description: `Player ${player} not found on Wallii`,
    };
  }

  const { data: latestSnapshot } = await supabase
    .from('leaderboard_snapshots')
    .select('player_id, rating')
    .eq('player_id', playerId)
    .order('snapshot_time', { ascending: false })
    .limit(1)
    .single();

  if (!latestSnapshot) {
    return {
      title: 'Player Not Found',
      description: 'This player could not be found in our database.',
    };
  }

  return {
    title: `${player} - Player Profile`,
    description: `View ${player}'s Hearthstone Battlegrounds player profile, statistics, and MMR history. Track rating changes, peak ratings, and performance over time.`,
    openGraph: {
      title: `${player} - Player Profile`,
      description: `View ${player}'s Hearthstone Battlegrounds player profile, statistics, and MMR history.`,
      url: `/stats/${encodeURIComponent(player)}`,
      type: 'profile',
    },
    twitter: {
      card: 'summary',
      title: `${player} - Player Profile`,
      description: `View ${player}'s Hearthstone Battlegrounds player profile, statistics, and MMR history.`,
    },
    alternates: {
      canonical: `/stats/${encodeURIComponent(player)}`,
    },
  };
}

export async function fetchPlayerData(player: string): Promise<FetchPlayerDataResult> {
  const { data: channelData, error: channelError } = await supabase
    .from('channels')
    .select('channel, player, live, youtube')
    .eq('player', player);
  if (channelError) {
    console.error('Error fetching channel data:', channelError);
  }

  const { data: chineseStreamerData, error: chineseError } = await supabase
    .from('chinese_streamers')
    .select('player, url')
    .eq('player', player);
  if (chineseError) {
    console.error('Error fetching Chinese streamer data:', chineseError);
  }

  const playerId = await getPlayerId(player);
  if (!playerId) {
    console.error('Player not found:', player);
    return {
      channelData: (channelData || []).map((entry) => ({
        channel: entry.channel,
        player: entry.player,
        live: entry.live,
        ...(entry.youtube ? { youtube: entry.youtube } : {}),
      })),
      chineseStreamerData: chineseStreamerData || [],
      allData: [],
      currentRanks: {},
      error: null,
    };
  }

  const pageSize = 1000;
  let allData: SnapshotPoint[] = [];
  let error: PostgrestError | null = null;
  let cursor: string | null = null;

  while (true) {
    let query = supabase
      .from('leaderboard_snapshots')
      .select('player_id, rating, snapshot_time, region, game_mode')
      .eq('player_id', playerId)
      .order('snapshot_time', { ascending: true })
      .limit(pageSize);

    if (cursor) {
      query = query.gt('snapshot_time', cursor);
    }

    const { data: chunk, error: chunkError } = await query;

    if (chunkError) {
      error = chunkError;
      break;
    }

    if (!chunk || chunk.length === 0) {
      break;
    }

    const transformedChunk: SnapshotPoint[] = chunk.map((entry) => ({
      player_name: player,
      rating: entry.rating,
      snapshot_time: entry.snapshot_time,
      region: entry.region,
      game_mode: entry.game_mode,
    }));

    allData = allData.concat(transformedChunk);
    cursor = chunk[chunk.length - 1].snapshot_time;

    if (chunk.length < pageSize) {
      break;
    }
  }

  const currentRanks: Record<string, number | null> = {};
  if (allData.length > 0) {
    const regions = [...new Set(allData.map((item) => item.region.toLowerCase()))];
    const gameModes = [...new Set(allData.map((item) => item.game_mode))];
    const { date: currentDate } = getCurrentLeaderboardDate();
    const combos = regions.flatMap((region) => gameModes.map((gameMode) => ({ region, gameMode })));

    const rankResults = await Promise.all(
      combos.map(async ({ region, gameMode }) => {
        const comboKey = `${region}-${gameMode}`;
        try {
          const { data: rankData, error: rankError } = await supabase
            .from('daily_leaderboard_stats')
            .select('rank')
            .eq('player_id', playerId)
            .eq('region', region.toUpperCase())
            .eq('game_mode', gameMode)
            .eq('day_start', currentDate)
            .order('updated_at', { ascending: false })
            .limit(1)
            .single();

          return { comboKey, rank: !rankError && rankData ? rankData.rank : null };
        } catch (rankLookupError) {
          console.error(`Error fetching rank for ${comboKey}:`, rankLookupError);
          return { comboKey, rank: null };
        }
      })
    );

    rankResults.forEach(({ comboKey, rank }) => {
      currentRanks[comboKey] = rank;
    });
  }

  return {
    channelData: (channelData || []).map((entry) => ({
      channel: entry.channel,
      player: entry.player,
      live: entry.live,
      ...(entry.youtube ? { youtube: entry.youtube } : {}),
    })),
    chineseStreamerData: chineseStreamerData || [],
    allData,
    currentRanks,
    error,
  };
}

function determineDefaultView(timestamp: string): 'all' | 'week' | 'day' {
  const changeTime = new Date(timestamp);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const startOfWeek = new Date(today);
  startOfWeek.setDate(startOfWeek.getDate() - ((startOfWeek.getDay() + 6) % 7));

  if (changeTime >= today) return 'day';
  if (changeTime >= startOfWeek) return 'week';
  return 'all';
}

function getMostRecentChange(allData: SnapshotPoint[]): SnapshotPoint | null {
  const groupedData = allData.reduce((acc, item) => {
    const key = `${item.region.toLowerCase()}-${item.game_mode}`;
    if (!acc[key]) {
      acc[key] = [];
    }
    acc[key].push(item);
    return acc;
  }, {} as Record<string, SnapshotPoint[]>);

  let mostRecentChange: SnapshotPoint | null = null;
  let mostRecentChangeTime = 0;

  Object.values(groupedData).forEach((items) => {
    const sorted = [...items].sort(
      (a, b) => new Date(b.snapshot_time).getTime() - new Date(a.snapshot_time).getTime()
    );

    const currentRating = sorted[0].rating;
    let lastChangeEntry = sorted[0];

    for (let i = 1; i < sorted.length; i += 1) {
      if (sorted[i].rating !== currentRating) {
        const changeTime = new Date(lastChangeEntry.snapshot_time).getTime();
        if (changeTime > mostRecentChangeTime) {
          mostRecentChange = lastChangeEntry;
          mostRecentChangeTime = changeTime;
        }
        break;
      }
      lastChangeEntry = sorted[i];
    }
  });

  if (!mostRecentChange && allData.length > 0) {
    mostRecentChange = allData.reduce((latest, current) =>
      new Date(current.snapshot_time) > new Date(latest.snapshot_time) ? current : latest
    );
  }

  return mostRecentChange;
}

export function resolveSelection({
  allData,
  requestedRegion,
  requestedView,
  requestedGameMode,
}: SelectionResolutionInput): SelectionResolution {
  const regions = [...new Set(allData.map((item) => item.region.toLowerCase()))];
  const gameModes = [...new Set(allData.map((item) => item.game_mode))];
  const availableCombos = [...new Set(allData.map((item) => `${item.region.toLowerCase()}-${item.game_mode}`))];

  const mostRecentChange = getMostRecentChange(allData);
  const defaultRegion = mostRecentChange?.region.toLowerCase() || 'na';
  const defaultMode: 'solo' | 'duo' = mostRecentChange?.game_mode === '1' ? 'duo' : 'solo';
  const defaultView = mostRecentChange ? determineDefaultView(mostRecentChange.snapshot_time) : 'all';

  const requestedGameModeEnum = requestedGameMode === 'duo' ? '1' : '0';
  const requestedCombo = `${requestedRegion}-${requestedGameModeEnum}`;

  const validGameMode: 'solo' | 'duo' = (() => {
    if (availableCombos.includes(requestedCombo)) {
      return requestedGameMode;
    }
    const targetRegion = requestedRegion === 'all' ? defaultRegion : requestedRegion;
    const hasDuo = availableCombos.includes(`${targetRegion}-1`);
    const hasSolo = availableCombos.includes(`${targetRegion}-0`);

    if (hasDuo && !hasSolo) return 'duo';
    if (hasSolo && !hasDuo) return 'solo';
    return defaultMode;
  })();

  const finalRegion = requestedRegion === 'all' ? defaultRegion : requestedRegion;
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
