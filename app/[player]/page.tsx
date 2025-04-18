import { Suspense } from 'react';
import { supabase } from '@/utils/supabaseClient';
import PlayerProfile from '@/components/PlayerProfile';
import { Metadata } from 'next';
import { redirect } from 'next/navigation';

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

const regionNames = {
  na: 'North America',
  eu: 'Europe',
  ap: 'Asia Pacific',
  cn: 'China'
};

export async function generateMetadata({ params, searchParams }: { params: Promise<PageParams>, searchParams: Promise<SearchParams> }): Promise<Metadata> {
  const [resolvedParams, resolvedSearchParams] = await Promise.all([params, searchParams]);
  const decodedPlayer = decodeURIComponent(resolvedParams.player.toLowerCase());
  const region = resolvedSearchParams.r || 'all';
  const regionName = regionNames[region as keyof typeof regionNames] || region.toUpperCase();
  const gameMode = resolvedSearchParams.g === 'd' ? 'Duo' : 'Solo';

  return {
    title: `${decodedPlayer} - ${regionName} ${gameMode} Player Profile | Wall_Lii`,
    description: `View ${decodedPlayer}'s Hearthstone Battlegrounds player profile, statistics, and MMR history for ${regionName} ${gameMode} mode. Track rating changes, peak ratings, and performance over time.`,
    openGraph: {
      title: `${decodedPlayer} - ${regionName} ${gameMode} Player Profile | Wall_Lii`,
      description: `View ${decodedPlayer}'s Hearthstone Battlegrounds player profile, statistics, and MMR history for ${regionName} ${gameMode} mode.`,
      url: `https://wall-lii.app/${encodeURIComponent(decodedPlayer)}?r=${region}&g=${gameMode.toLowerCase()}`,
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
      title: `${decodedPlayer} - ${regionName} ${gameMode} Player Profile | Wall_Lii`,
      description: `View ${decodedPlayer}'s Hearthstone Battlegrounds player profile, statistics, and MMR history for ${regionName} ${gameMode} mode.`,
      images: ['/og-image.jpg']
    },
    alternates: {
      canonical: `https://wall-lii.app/${encodeURIComponent(decodedPlayer)}?r=${region}&g=${gameMode.toLowerCase()}`
    }
  };
}

interface PlayerModes {
  regions: string[];
  gameModes: string[];
  defaultRegion: string;
  defaultGameMode: string;
  availableCombos: string[]; // e.g. ['na-0', 'na-1', 'cn-0']
}

interface PlayerData {
  name: string;
  rank: number;
  rating: number;
  peak: number;
  region: string;
  data: { snapshot_time: string; rating: number }[];
  availableModes: PlayerModes;
}

export default async function PlayerPage({
  params,
  searchParams,
}: PageProps) {
  const [resolvedParams, resolvedSearchParams] = await Promise.all([
    params,
    searchParams
  ]);
  console.log(resolvedParams.player);
  const player = decodeURIComponent(resolvedParams.player);
  console.log(player);
  const requestedRegion = resolvedSearchParams.r || 'all';
  const requestedView = resolvedSearchParams.v;
  const requestedOffset = parseInt(resolvedSearchParams.o || '0', 10);
  const requestedGameMode = resolvedSearchParams.g || 's';

  // Fetch all data for the player across all regions and game modes
  const { data, error } = await supabase
    .from('leaderboard_snapshots')
    .select('player_name, rating, snapshot_time, region, rank, game_mode')
    .eq('player_name', player)
    .order('snapshot_time', { ascending: true });

  if (error || !data || data.length === 0) {
    return (
      <div className="container mx-auto p-4 max-w-4xl">
        <div className="bg-gray-900 rounded-lg p-6">
          <div className="text-2xl font-bold text-white mb-4 text-center">
            No data found for {player}
          </div>
        </div>
      </div>
    );
  }

  // Get unique regions and game modes for this player
  const regions = [...new Set(data.map(item => item.region.toLowerCase()))];
  const gameModes = [...new Set(data.map(item => item.game_mode))];
  
  // Create all possible combinations that exist in the data
  const availableCombos = data.reduce((acc, item) => {
    const combo = `${item.region.toLowerCase()}-${item.game_mode}`;
    if (!acc.includes(combo)) {
      acc.push(combo);
    }
    return acc;
  }, [] as string[]);

  // Group data by region and game mode
  const groupedData = data.reduce((acc, item) => {
    const key = `${item.region.toLowerCase()}-${item.game_mode}`;
    if (!acc[key]) {
      acc[key] = [];
    }
    acc[key].push(item);
    return acc;
  }, {} as Record<string, typeof data>);

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
    mostRecentChange = data.reduce((latest, current) => {
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
  if (!availableCombos.includes(requestedCombo) || !requestedView) {
    // Redirect with all the determined defaults
    const params = new URLSearchParams({
      r: defaultRegion,
      g: defaultGameMode === '1' ? 'd' : 's',
      v: defaultView,
      o: '0'
    });
    redirect(`/${encodeURIComponent(player)}?${params.toString()}`);
  }

  // Filter data for the current region and game mode
  const filteredData = data.filter(
    item =>
      item.region.toLowerCase() === requestedRegion &&
      item.game_mode === (requestedGameMode === 'd' ? '1' : '0')
  );

  const playerData: PlayerData = {
    name: player,
    rank: filteredData[filteredData.length - 1]?.rank,
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
      />
    </Suspense>
  );
} 