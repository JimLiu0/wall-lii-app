import { Suspense } from 'react';
import { supabase } from '@/utils/supabaseClient';
import PlayerProfile from '@/components/PlayerProfile';
import { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { PostgrestError } from '@supabase/supabase-js';
import PlayerNotFound from '@/components/PlayerNotFound';


interface PageParams {
  player: string;
}

interface SearchParams {
  r?: string;
  v?: string;
  o?: string;
  g?: string;
}

interface PageProps {
  params: Promise<PageParams>;
  searchParams: Promise<SearchParams>;
}



interface PlayerData {
  name: string;
  rank: number; // Now required since we fetch it from daily_leaderboard_stats_test
  rating: number;
  peak: number;
  region: string;
  data: { snapshot_time: string; rating: number }[];
  availableModes: {
    regions: string[];
    gameModes: string[];
    defaultRegion: string;
    defaultGameMode: string;
    availableCombos: string[];
  };
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

  // Fetch all data for the player using pagination to avoid Supabase limits
  const pageSize = 1000;
  let allData: Array<{
    player_name: string;
    rating: number;
    snapshot_time: string;
    region: string;
    game_mode: string;
  }> = [];
  let from = 0;
  let error: PostgrestError | null = null;
  
  while (true) {
    const { data: chunk, error: chunkError } = await supabase
      .from('leaderboard_snapshots_test')
      .select(`
        player_id,
        rating, 
        snapshot_time, 
        region, 
        game_mode,
        players!inner(player_name)
      `)
      .eq('players.player_name', player)
      .order('snapshot_time', { ascending: true })
      .range(from, from + pageSize - 1);
    if (chunkError) {
      error = chunkError;
      break;
    }
    // Transform the data to match expected format
    const transformedChunk = (chunk || []).map((entry: any) => ({
      player_name: entry.players.player_name,
      rating: entry.rating,
      snapshot_time: entry.snapshot_time,
      region: entry.region,
      game_mode: entry.game_mode,
    }));
    allData = allData.concat(transformedChunk);
    if (!chunk || chunk.length < pageSize) {
      // No more rows
      break;
    }
    from += pageSize;
  }

  return {
    channelData: channelData || [],
    chineseStreamerData: chineseStreamerData || [],
    allData,
    error
  };
}

// ISR: Generate static params for popular players
export async function generateStaticParams() {
  // Fetch top players to pre-generate their pages
  const { data: topPlayers } = await supabase
    .from('daily_leaderboard_stats_test')
    .select(`
      player_id,
      players!inner(player_name)
    `)
    .eq('day_start', new Date().toISOString().split('T')[0])
    .limit(100);

  if (!topPlayers) return [];

  return topPlayers.map((player: any) => ({
    player: player.players.player_name.toLowerCase(),
  }));
}

// ISR: Revalidate every 5 minutes
export const revalidate = 300;

export async function generateMetadata({ params, searchParams }: { params: Promise<PageParams>, searchParams: Promise<SearchParams> }): Promise<Metadata> {
  const [resolvedParams] = await Promise.all([params, searchParams]);
  const decodedPlayer = decodeURIComponent(resolvedParams.player.toLowerCase());

  // Fetch minimal data for metadata
  const { allData } = await fetchPlayerData(decodedPlayer);
  
  if (!allData || allData.length === 0) {
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
  const requestedRegion = resolvedSearchParams.r || 'all';
  const requestedView = resolvedSearchParams.v;
  const requestedOffset = parseInt(resolvedSearchParams.o || '0', 10);
  const requestedGameMode = resolvedSearchParams.g || 's';

  // Use shared data fetching function
  const { channelData, chineseStreamerData, allData, error } = await fetchPlayerData(player);

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
  }, {} as Record<string, typeof allData>);

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
  if (!mostRecentChange) {
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

  const defaultRegion = mostRecentChange.region.toLowerCase();
  const defaultGameMode = mostRecentChange.game_mode;
  const defaultView = determineDefaultView(mostRecentChange.snapshot_time);

  // Find the most recent valid combination if requested one doesn't exist
  const requestedCombo = `${requestedRegion}-${requestedGameMode === 'd' ? '1' : '0'}`;
  
  // Determine valid game mode based on available combos
  const validGameMode = (() => {
    if (requestedGameMode && availableCombos.includes(requestedCombo)) {
      return requestedGameMode;
    }
    // Check if player has duo games in the requested/default region
    const hasDuo = availableCombos.includes(`${requestedRegion === 'all' ? defaultRegion : requestedRegion}-1`);
    // Check if player has solo games in the requested/default region
    const hasSolo = availableCombos.includes(`${requestedRegion === 'all' ? defaultRegion : requestedRegion}-0`);
    
    if (hasDuo && !hasSolo) return 'd';
    if (hasSolo && !hasDuo) return 's';
    return defaultGameMode === '1' ? 'd' : 's';
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
    // Keep existing params if they're valid
    const params = new URLSearchParams({
      r: requestedRegion === 'all' ? defaultRegion : requestedRegion,
      g: validGameMode,
      v: requestedView || defaultView,
      o: requestedOffset.toString()
    });
    redirect(`/stats/${encodeURIComponent(player)}?${params.toString()}`);
  }

  // Filter data for the current region and game mode
  const filteredData = allData.filter(
    item =>
      item.region.toLowerCase() === requestedRegion &&
      item.game_mode === (requestedGameMode === 'd' ? '1' : '0')
  );

  // Fetch latest rank from daily_leaderboard_stats_test using player_name
  let playerRank: number | undefined;
  if (allData.length > 0) {
    const { data: rankData } = await supabase
      .from('daily_leaderboard_stats_test')
      .select(`
        rank,
        players!inner(player_name)
      `)
      .eq('players.player_name', player)
      .order('day_start', { ascending: false })
      .limit(1);
    
    if (rankData && rankData.length > 0) {
      playerRank = rankData[0].rank;
    }
  }

  const playerData: PlayerData = {
    name: player,
    rank: playerRank ?? 0, // Use fetched rank or default to 0
    rating: filteredData[filteredData.length - 1]?.rating,
    peak: filteredData.reduce((max, item) => Math.max(max, item.rating), 0),
    region: requestedRegion,
    data: filteredData.map((item) => ({
      snapshot_time: item.snapshot_time,
      rating: item.rating,
    })),
    availableModes: {
      regions,
      gameModes,
      defaultRegion: requestedRegion,
      defaultGameMode: requestedGameMode === 'd' ? '1' : '0',
      availableCombos
    }
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
        offset={requestedOffset}
        playerData={playerData}
        channelData={channelData}
        chineseStreamerData={chineseStreamerData}
      />
    </Suspense>
  );
} 