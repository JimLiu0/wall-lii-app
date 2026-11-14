import { unstable_cache } from 'next/cache';
import { getLeaderboardDateRange, type DateRange } from '@/utils/dateUtils';
import {
  CACHE_TTL_MS,
  fetchLeaderboardMinDate,
  fetchLeaderboardPageUncached,
  fetchLeaderboardSocialData,
  type InitialLeaderboardState,
  type LeaderboardFetchContext,
} from './data';

const getCachedInitialState = unstable_cache(
  async (context: LeaderboardFetchContext, dateRange: DateRange): Promise<InitialLeaderboardState> => {
    const [leaderboard, minDate] = await Promise.all([
      fetchLeaderboardPageUncached(context, dateRange),
      fetchLeaderboardMinDate(context.region, context.mode),
    ]);
    const social = await fetchLeaderboardSocialData(leaderboard.entries);
    return { ...leaderboard, ...social, minDate, errorMessage: null };
  },
  ['leaderboard-initial-state-v1'],
  { revalidate: CACHE_TTL_MS / 1000 },
);

export async function fetchInitialLeaderboardState(context: LeaderboardFetchContext) {
  // Absolute dates separate midnight/weekly rollover and the 00:05 PT fallback.
  // Do not persist the page's error fallback: a failed query must remain retryable.
  const dateRange = await getLeaderboardDateRange(context.timeframe, context.dateOffset);
  return getCachedInitialState(context, dateRange);
}
