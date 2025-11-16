import { Suspense } from 'react';
import { supabase } from '@/utils/supabaseClient';
import PlayerProfile from '@/components/PlayerProfile';
import { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { PostgrestError } from '@supabase/supabase-js';
import PlayerNotFound from '@/components/PlayerNotFound';
import { getPlayerId } from '@/utils/playerUtils';
import { getCurrentLeaderboardDate } from '@/utils/dateUtils';
import { normalizeUrlParams, toNewUrlParams, hasOldFormat } from '@/utils/urlParams';


interface PageParams {
  player: string;
}

interface SearchParams {
  // Old format (for backwards compatibility)
  r?: string;
  v?: string;
  o?: string;
  g?: string;
  // New format
  region?: string;
  mode?: string;
  view?: string;
  date?: string;
}

interface PageProps {
  params: Promise<PageParams>;
  searchParams: Promise<SearchParams>;
}



interface PlayerData {
  name: string;
  data: { game_mode: string, player_name: string, region: string, snapshot_time: string; rating: number }[];
  availableModes: {
    regions: string[];
    gameModes: string[];
    defaultRegion: string;
    defaultGameMode: string;
    availableCombos: string[];
  };
  currentRanks: Record<string, number | null>; // Key: "region-gameMode", Value: rank
}



// Shared data fetching function to avoid double fetching
async function fetchPlayerData(player: string) {
  // Fetch channel data
  const { data: channelData, error: channelError } = await supabase
    .from('channels')
    .select('channel, player, live, youtube')
    .eq('player', player);
  if (channelError) {
    console.error('Error fetching channel data:', channelError);
  }

  // Fetch Chinese streamer data
  const { data: chineseStreamerData, error: chineseError } = await supabase
    .from('chinese_streamers')
    .select('player, url')
    .eq('player', player);
  if (chineseError) {
    console.error('Error fetching Chinese streamer data:', chineseError);
  }

  // Step 1: Get player_id efficiently
  const playerId = await getPlayerId(player);
  if (!playerId) {
    console.error('Player not found:', player);
    return {
      channelData: channelData || [],
      chineseStreamerData: chineseStreamerData || [],
      allData: [],
      error: null
    };
  }

  // Step 2: Fetch all data using keyset pagination instead of OFFSET
  const pageSize = 1000;
  let allData: Array<{
    player_name: string;
    rating: number;
    snapshot_time: string;
    region: string;
    game_mode: string;
  }> = [];
  let error: PostgrestError | null = null;
  let cursor: string | null = null;
  
  while (true) {
    let query = supabase
      .from('leaderboard_snapshots')
      .select('player_id, rating, snapshot_time, region, game_mode')
      .eq('player_id', playerId)
      .order('snapshot_time', { ascending: true })
      .limit(pageSize);
    
    // Add cursor for keyset pagination
    if (cursor) {
      query = query.gt('snapshot_time', cursor);
    }
    
    const { data: chunk, error: chunkError } = await query;
    
    if (chunkError) {
      error = chunkError;
      break;
    }
    
    if (!chunk || chunk.length === 0) {
      // No more rows
      break;
    }
    
    // Transform the data to match expected format
    const transformedChunk = chunk.map((entry) => ({
      player_name: player, // We already know the player name
      rating: entry.rating,
      snapshot_time: entry.snapshot_time,
      region: entry.region,
      game_mode: entry.game_mode,
    }));
    
    allData = allData.concat(transformedChunk);
    
    // Set cursor to the last snapshot_time for next iteration
    cursor = chunk[chunk.length - 1].snapshot_time;
    
    // If we got fewer rows than pageSize, we're done
    if (chunk.length < pageSize) {
      break;
    }
  }

  // Step 3: Fetch current ranks for all valid combinations
  const currentRanks: Record<string, number | null> = {};
  
  if (allData.length > 0) {
    // Get unique regions and game modes from the data
    const regions = [...new Set(allData.map(item => item.region.toLowerCase()))];
    const gameModes = [...new Set(allData.map(item => item.game_mode))];
    
    // Get current leaderboard date
    const { date: currentDate } = getCurrentLeaderboardDate();
    
    // Fetch ranks for all valid combinations
    for (const region of regions) {
      for (const gameMode of gameModes) {
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
          
          if (!rankError && rankData) {
            currentRanks[comboKey] = rankData.rank;
          } else {
            currentRanks[comboKey] = null;
          }
        } catch (error) {
          console.error(`Error fetching rank for ${comboKey}:`, error);
          currentRanks[comboKey] = null;
        }
      }
    }
  }

  return {
    channelData: channelData || [],
    chineseStreamerData: chineseStreamerData || [],
    allData,
    currentRanks,
    error
  };
}

// ISR: Generate static params for popular players
export async function generateStaticParams() {
  // Fetch top players to pre-generate their pages
  // Use a fixed date or remove the date filter to avoid dynamic behavior
  const { data: topPlayers } = await supabase
    .from('daily_leaderboard_stats')
    .select(`
      player_id,
      players!inner(player_name)
    `)
    .order('day_start', { ascending: false })
    .limit(100);

  if (!topPlayers) return [];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return topPlayers.map((player: any) => ({
    player: player.players.player_name.toLowerCase(),
  }));
}

// ISR: Revalidate every 5 minutes
export const revalidate = 300;

export async function generateMetadata({ params, searchParams }: { params: Promise<PageParams>, searchParams: Promise<SearchParams> }): Promise<Metadata> {
  const [resolvedParams] = await Promise.all([params, searchParams]);
  const decodedPlayer = decodeURIComponent(resolvedParams.player.toLowerCase());

  // Step 1: Get player_id efficiently
  const playerId = await getPlayerId(decodedPlayer);
  if (!playerId) {
    return {
      title: 'Player Not Found | Wallii',
      description: `Player ${decodedPlayer} not found on Wallii`,
    };
  }

  // Step 2: Get latest snapshot using player_id
  const { data: latestSnapshot } = await supabase
    .from('leaderboard_snapshots')
    .select('player_id, rating')
    .eq('player_id', playerId)
    .order('snapshot_time', { ascending: false })
    .limit(1)
    .single();

  if (!latestSnapshot) {
    return {
      title: 'Player Not Found | Wallii',
      description: 'This player could not be found in our database.'
    };
  }

  return {
    title: `${decodedPlayer} - Player Profile`,
    description: `View ${decodedPlayer}'s Hearthstone Battlegrounds player profile, statistics, and MMR history. Track rating changes, peak ratings, and performance over time.`,
    openGraph: {
      title: `${decodedPlayer} - Player Profile`,
      description: `View ${decodedPlayer}'s Hearthstone Battlegrounds player profile, statistics, and MMR history.`,
      url: `https://wallii.gg/stats/${encodeURIComponent(decodedPlayer)}`,
      type: 'profile',
      images: [
        {
          url: '/og-image.jpg',
          width: 1200,
          height: 630,
          alt: `${decodedPlayer}'s Hearthstone Battlegrounds Profile`
        }
      ]
    },
    twitter: {
      card: 'summary_large_image',
      title: `${decodedPlayer} - Player Profile`,
      description: `View ${decodedPlayer}'s Hearthstone Battlegrounds player profile, statistics, and MMR history.`,
      images: ['/og-image.jpg']
    },
    alternates: {
      canonical: `https://wallii.gg/stats/${encodeURIComponent(decodedPlayer)}`
    }
  };
}

export default async function PlayerPage({
  params,
  searchParams,
}: PageProps) {
  const [resolvedParams, resolvedSearchParams] = await Promise.all([
    params,
    searchParams
  ]);
  const player = decodeURIComponent(resolvedParams.player.toLowerCase());
  
  // Check if old format is being used and redirect to new format
  if (hasOldFormat(resolvedSearchParams)) {
    const normalized = normalizeUrlParams(resolvedSearchParams);
    const params = toNewUrlParams({
      region: normalized.region,
      mode: normalized.mode,
      view: normalized.view,
      date: normalized.date
    });
    redirect(`/stats/${encodeURIComponent(player)}?${params.toString()}`);
  }
  
  // Normalize URL parameters (now only new format)
  const normalized = normalizeUrlParams(resolvedSearchParams);
  const requestedRegion = normalized.region;
  const requestedView = normalized.view;
  const requestedGameMode = normalized.mode;

  // Use shared data fetching function
  const { channelData, chineseStreamerData, allData, currentRanks, error } = await fetchPlayerData(player);

  if (error || !allData || allData.length === 0) {
    return <PlayerNotFound player={player} />;
  }

  // Get unique regions and game modes for this player
  const regions = [...new Set(allData.map(item => item.region.toLowerCase()))];
  const gameModes = [...new Set(allData.map(item => item.game_mode))];
  
  // Create all possible combinations that exist in the data
  const availableCombos = allData.reduce((acc, item) => {
    const combo = `${item.region.toLowerCase()}-${item.game_mode}`;
    if (!acc.includes(combo)) {
      acc.push(combo);
    }
    return acc;
  }, [] as string[]);

  // Group data by region and game mode
  const groupedData = allData.reduce((acc, item) => {
    const key = `${item.region.toLowerCase()}-${item.game_mode}`;
    if (!acc[key]) {
      acc[key] = [];
    }
    acc[key].push(item);
    return acc;
  }, {} as Record<string, Array<{ game_mode: string, player_name: string, region: string, snapshot_time: string; rating: number }>>);

  // Find the most recent rating change across all combinations
  let mostRecentChange = null;
  let mostRecentChangeTime = 0;

  Object.entries(groupedData).forEach(([, items]) => {
    // Sort by time descending
    const sorted = [...items].sort((a, b) => 
      new Date(b.snapshot_time).getTime() - new Date(a.snapshot_time).getTime()
    );

    // Find the most recent rating change in this combo
    const currentRating = sorted[0].rating;
    let lastChangeEntry = sorted[0];

    for (let i = 1; i < sorted.length; i++) {
      if (sorted[i].rating !== currentRating) {
        // Found a rating change
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

  // If no rating changes found, just use the most recent entry overall
  if (!mostRecentChange && allData.length > 0) {
    mostRecentChange = allData.reduce((latest, current) => {
      return new Date(current.snapshot_time) > new Date(latest.snapshot_time) ? current : latest;
    });
  }

  // Determine default view based on when the change happened
  function determineDefaultView(timestamp: string) {
    const changeTime = new Date(timestamp);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const startOfWeek = new Date(today);
    startOfWeek.setDate(startOfWeek.getDate() - ((startOfWeek.getDay() + 6) % 7)); // Monday

    if (changeTime >= today) {
      return 'd';
    } else if (changeTime >= startOfWeek) {
      return 'w';
    } else {
      return 's';
    }
  }

  const defaultRegion = mostRecentChange?.region.toLowerCase() || 'na';
  const defaultGameMode = mostRecentChange?.game_mode || '0';
  const defaultViewOld = mostRecentChange ? determineDefaultView(mostRecentChange.snapshot_time) : 's';
  const defaultView: 'all' | 'week' | 'day' = defaultViewOld === 'w' ? 'week' : defaultViewOld === 'd' ? 'day' : 'all';
  const defaultMode: 'solo' | 'duo' = defaultGameMode === '1' ? 'duo' : 'solo';

  // Find the most recent valid combination if requested one doesn't exist
  const requestedGameModeEnum = requestedGameMode === 'duo' ? '1' : '0';
  const requestedCombo = `${requestedRegion}-${requestedGameModeEnum}`;
  
  // Determine valid game mode based on available combos
  const validGameMode: 'solo' | 'duo' = (() => {
    if (requestedGameMode && availableCombos.includes(requestedCombo)) {
      return requestedGameMode;
    }
    // Check if player has duo games in the requested/default region
    const hasDuo = availableCombos.includes(`${requestedRegion === 'all' ? defaultRegion : requestedRegion}-1`);
    // Check if player has solo games in the requested/default region
    const hasSolo = availableCombos.includes(`${requestedRegion === 'all' ? defaultRegion : requestedRegion}-0`);
    
    if (hasDuo && !hasSolo) return 'duo';
    if (hasSolo && !hasDuo) return 'solo';
    return defaultMode;
  })();

  // Only redirect if absolutely necessary
  if (
    // If region is 'all' or invalid, we need to redirect
    (requestedRegion === 'all' || !availableCombos.includes(requestedCombo)) ||
    // If no view is specified, we need to redirect
    !requestedView ||
    // If game mode doesn't match available modes
    requestedGameMode !== validGameMode
  ) {
    // Use new URL format for redirects
    const finalRegion = requestedRegion === 'all' ? defaultRegion : requestedRegion;
    const finalView = requestedView || defaultView;
    const finalDate = normalized.date;
    
    const params = toNewUrlParams({
      region: finalRegion,
      mode: validGameMode,
      view: finalView,
      date: finalDate
    });
    redirect(`/stats/${encodeURIComponent(player)}?${params.toString()}`);
  }

  const playerData: PlayerData = {
    name: player,
    data: allData,
    availableModes: {
      regions,
      gameModes,
      defaultRegion: requestedRegion,
      defaultGameMode: requestedGameMode === 'duo' ? '1' : '0',
      availableCombos
    },
    currentRanks: currentRanks || {}
  };

  return (
    <Suspense fallback={
      <div className="container mx-auto p-4">
        <div className="bg-gray-900 rounded-lg p-6">
          <div className="text-2xl font-bold text-white mb-4 text-center">Loading...</div>
        </div>
      </div>
    }>
      <PlayerProfile
        player={player}
        region={requestedRegion}
        view={requestedView}
        date={normalized.date}
        playerData={playerData}
        channelData={channelData}
        chineseStreamerData={chineseStreamerData}
      />
    </Suspense>
  );
} 