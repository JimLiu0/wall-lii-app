import { supabase } from './supabaseClient';
import { DateTime } from 'luxon';

export async function fetchWeeklySnapshots(playerName: string, region: string, offset: number) {
  const now = DateTime.now(); // User's local time zone
  const startOfWeek = now
    .minus({ weeks: offset })
    .startOf('week')
    .startOf('day')
    .toUTC();
  const endOfWeek = startOfWeek.plus({ days: 7 });

  const { data, error } = await supabase
    .from('leaderboard_snapshots')
    .select('player_name, rating, snapshot_time, region')
    .eq('player_name', playerName)
    .eq('region', region.toUpperCase())
    .gte('snapshot_time', startOfWeek.toISO())
    .lt('snapshot_time', endOfWeek.toISO())
    .order('snapshot_time', { ascending: true });

  if (error || !data) {
    console.error('Supabase fetch error:', error);
    return [];
  }

  // Remove consecutive duplicate ratings
  const filtered = data.filter((entry, index, arr) => {
    if (index === 0) return true;
    return entry.rating !== arr[index - 1].rating;
  });

  return filtered;
}

export async function fetchDailySnapshots(playerName: string, region: string, offset: number) {
  const now = DateTime.now(); // user's local time
  const startOfDay = now
    .minus({ days: offset })
    .startOf('day')
    .toUTC();
  const endOfDay = startOfDay.plus({ days: 1 });

  const { data, error } = await supabase
    .from('leaderboard_snapshots')
    .select('player_name, rating, snapshot_time, region')
    .eq('player_name', playerName)
    .eq('region', region.toUpperCase())
    .gte('snapshot_time', startOfDay.toISO())
    .lt('snapshot_time', endOfDay.toISO())
    .order('snapshot_time', { ascending: true });

  if (error || !data) {
    console.error('Supabase fetch error:', error);
    return [];
  }

  const filtered = data.filter((entry, index, arr) => {
    if (index === 0) return true;
    return entry.rating !== arr[index - 1].rating;
  });

  return filtered;
}