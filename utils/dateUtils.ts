import { DateTime } from 'luxon';

export interface DateRange {
  currentStart: string;
  prevStart: string;
  isUsingFallback: boolean;
}

/**
 * Gets the appropriate date range for leaderboard queries, with fallback to previous day
 * if today's data isn't available yet (edge case around midnight PT).
 */
export async function getLeaderboardDateRange(timeframe: 'day' | 'week' = 'day', dayOffset: number): Promise<DateRange> {
  const ptNow = DateTime.now().setZone('America/Los_Angeles');
  const today = ptNow.minus({ days: dayOffset }).startOf('day');

  // Avoid a database availability probe on every request. The probe can block
  // the whole serverless function when Supabase is slow. The leaderboard data
  // is refreshed after midnight, so use yesterday only during the short window
  // when today's snapshot may not exist yet.
  const cutoffTime = today.plus({ minutes: 5 });
  const isUsingFallback = dayOffset === 0 && ptNow < cutoffTime;
  const current = isUsingFallback ? today.minus({ days: 1 }) : today;
  const currentStart = current.toISODate() || '';

  const prevStart = timeframe === 'day'
    ? current.minus({ days: 1 }).toISODate() || ''
    : current.startOf('week').minus({ days: 1 }).toISODate() || '';

  return {
    currentStart,
    prevStart,
    isUsingFallback,
  };
}

/**
 * Gets the current date for leaderboard queries, with time-based fallback to previous day
 * if it's before 12:05 AM PT (to handle data update delays).
 */
export function getCurrentLeaderboardDate(): { date: string; isUsingFallback: boolean } {
  const ptNow = DateTime.now().setZone('America/Los_Angeles');
  const today = ptNow.startOf('day');
  
  // If it's before 12:05 AM PT, use yesterday's data to ensure availability
  const cutoffTime = today.plus({ minutes: 5 }); // 12:05 AM PT
  const isUsingFallback = ptNow < cutoffTime;
  
  const targetDate = isUsingFallback ? today.minus({ days: 1 }) : today;
  
  return {
    date: targetDate.toISODate() || '',
    isUsingFallback
  };
}
