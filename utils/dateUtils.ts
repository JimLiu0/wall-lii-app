import { DateTime } from 'luxon';
import { supabase } from './supabaseClient';

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
  const todayStr = today.toISODate() || '';

  // First, try to get today's data to see if it exists
  const { data: todayData, error } = await supabase
    .from('daily_leaderboard_stats_test')
    .select('day_start')
    .eq('day_start', todayStr)
    .limit(1);

  // If today's data exists, use it
  if (!error && todayData && todayData.length > 0) {
    let currentStart: string;
    let prevStart: string;

    if (timeframe === 'day') {
      currentStart = todayStr;
      prevStart = today.minus({ days: 1 }).toISODate() || '';
    } else {
      // Weekly baseline: start of current week (Monday)
      const weekStart = today.startOf('week').minus({ days: 1 });
      currentStart = todayStr;
      prevStart = weekStart.toISODate() || '';
    }

    return {
      currentStart,
      prevStart,
      isUsingFallback: false
    };
  }

  // If today's data doesn't exist, fall back to yesterday
  const yesterday = today.minus({ days: 1 });
  const yesterdayStr = yesterday.toISODate() || '';

  let currentStart: string;
  let prevStart: string;

  if (timeframe === 'day') {
    currentStart = yesterdayStr;
    prevStart = yesterday.minus({ days: 1 }).toISODate() || '';
  } else {
    // Weekly baseline: start of previous week (Monday)
    const weekStart = yesterday.startOf('week').minus({ days: 1 });
    currentStart = yesterdayStr;
    prevStart = weekStart.toISODate() || '';
  }

  return {
    currentStart,
    prevStart,
    isUsingFallback: true
  };
}

/**
 * Gets the current date for leaderboard queries, with fallback to previous day
 * if today's data isn't available yet.
 */
export async function getCurrentLeaderboardDate(): Promise<{ date: string; isUsingFallback: boolean }> {
  const ptNow = DateTime.now().setZone('America/Los_Angeles');
  const today = ptNow.startOf('day');
  const todayStr = today.toISODate() || '';

  // Check if today's data exists
  const { data: todayData, error } = await supabase
    .from('daily_leaderboard_stats_test')
    .select('day_start')
    .eq('day_start', todayStr)
    .limit(1);

  if (!error && todayData && todayData.length > 0) {
    return {
      date: todayStr,
      isUsingFallback: false
    };
  }

  // Fall back to yesterday
  const yesterday = today.minus({ days: 1 });
  return {
    date: yesterday.toISODate() || '',
    isUsingFallback: true
  };
} 