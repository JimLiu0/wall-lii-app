import { fetchInitialLeaderboardState, fetchUncachedInitialLeaderboardState } from '../_lib/server';
import LeaderboardTableClient from './LeaderboardTableClient';
import NewsBanner from '@/components/shared/NewsBanner';
import SeasonResetBanner from '@/components/shared/SeasonResetBanner';
import TimedAnnouncementBanner from '@/components/shared/TimedAnnouncementBanner';
import AdPageShell from '@/components/ads/AdPageShell';
import { adSlots } from '@/components/ads/adSlots';
import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { normalizeUrlParams } from '@/utils/urlParams';
import {
  getLeaderboardDateOffset,
  PAGE_SIZE,
  type InitialLeaderboardState,
  type LeaderboardMode,
} from '../_lib/data';

interface PageParams {
  region: string;
  mode: string;
}

interface PageProps {
  cachePage?: boolean;
  params: Promise<PageParams>;
  searchParams: Promise<{
    view?: string;
    date?: string;
    v?: string;
    o?: string;
  }>;
}

const validRegions = ['na', 'eu', 'ap', 'cn', 'all'];
const validModes = ['solo', 'duo'];
const regionNames = {
  na: 'North America',
  eu: 'Europe',
  ap: 'Asia Pacific',
  cn: 'China',
  all: 'Global'
};

const modeNames = {
  solo: 'Solo',
  duo: 'Duos'
};

export async function generateMetadata({ params }: { params: Promise<PageParams> }): Promise<Metadata> {
  const resolvedParams = await params;
  const region = resolvedParams.region.toLowerCase();
  const mode = resolvedParams.mode.toLowerCase();

  if (!validRegions.includes(region) || !validModes.includes(mode)) {
    return {
      title: 'Region Not Found',
      description: 'This region does not exist in Wallii'
    };
  }

  const regionName = regionNames[region as keyof typeof regionNames];
  const modeName = modeNames[mode as keyof typeof modeNames];
  return {
    alternates: { canonical: `/lb/${region}/${mode}` },
    title: `${regionName} ${modeName} Leaderboard`,
    description: `View detailed ${regionName} ${modeName} Hearthstone Battlegrounds leaderboard rankings. Track player ratings, compare performance, and analyze trends in real-time.`,
  };
}

export default async function LeaderboardPage({ params, searchParams, cachePage = false }: PageProps) {
  const [resolvedParams, resolvedSearchParams] = await Promise.all([params, searchParams]);
  const { region, mode } = resolvedParams;

  if (!validRegions.includes(region.toLowerCase()) || !validModes.includes(mode.toLowerCase())) {
    notFound();
  }

  const defaultSolo = mode.toLowerCase() === 'solo';
  const normalizedRegion = region.toLowerCase();
  const normalizedMode: LeaderboardMode = defaultSolo ? 'solo' : 'duo';
  const normalizedParams = normalizeUrlParams({
    ...resolvedSearchParams,
    region: normalizedRegion,
    mode: normalizedMode,
  });
  const initialView = normalizedParams.view === 'week' ? 'week' : 'day';
  const dateOffset = getLeaderboardDateOffset(normalizedParams.date);

  let initialState: InitialLeaderboardState;
  try {
    const fetchState = cachePage ? fetchUncachedInitialLeaderboardState : fetchInitialLeaderboardState;
    initialState = await fetchState({
      region: normalizedRegion,
      mode: normalizedMode,
      timeframe: initialView,
      dateOffset,
      pageIndex: 0,
      pageSize: PAGE_SIZE,
      search: '',
    });
  } catch (error) {
    // Failed ISR regeneration must retain the last successful page, not cache an empty table.
    if (cachePage) throw error;
    console.error('Error fetching initial leaderboard state:', error);
    initialState = {
      entries: [],
      totalRows: 0,
      channelData: [],
      chineseStreamerData: [],
      minDate: null,
      errorMessage: 'Unable to load leaderboard data.',
    };
  }

  return (
    <div className="min-h-screen">
      <main>
        <AdPageShell
          topSlot={adSlots.top}
          contentMaxWidth="56rem"
        >
          <SeasonResetBanner />
          <TimedAnnouncementBanner />
          <NewsBanner />
          <LeaderboardTableClient
            key={`${normalizedRegion}-${normalizedMode}-${initialView}-${normalizedParams.date}`}
            region={normalizedRegion}
            defaultSolo={defaultSolo}
            initialView={initialView}
            initialDate={normalizedParams.date}
            initialState={initialState}
          />
        </AdPageShell>
      </main>
    </div>
  );
}
