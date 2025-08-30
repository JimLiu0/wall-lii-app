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
    .from('leaderboard_snapshots_test')
    .select(`
      player_id,
      rating, 
      snapshot_time, 
      region,
      players!inner(player_name)
    `)
    .eq('players.player_name', playerName)
    .eq('region', region.toUpperCase())
    .gte('snapshot_time', startOfWeek.toISO())
    .lt('snapshot_time', endOfWeek.toISO())
    .order('snapshot_time', { ascending: true });

  if (error || !data) {
    console.error('Supabase fetch error:', error);
    return [];
  }

  // Transform data to match expected format
  const transformed = (data || []).map((entry: any) => ({
    player_name: entry.players.player_name,
    rating: entry.rating,
    snapshot_time: entry.snapshot_time,
    region: entry.region,
  }));

  // No need for dedup logic since the new table doesn't have consecutive duplicate ratings
  return transformed;
}

export async function fetchDailySnapshots(playerName: string, region: string, offset: number) {
  const now = DateTime.now(); // user's local time
  const startOfDay = now
    .minus({ days: offset })
    .startOf('day')
    .toUTC();
  const endOfDay = startOfDay.plus({ days: 1 });

  const { data, error } = await supabase
    .from('leaderboard_snapshots_test')
    .select(`
      player_id,
      rating, 
      snapshot_time, 
      region,
      players!inner(player_name)
    `)
    .eq('players.player_name', playerName)
    .eq('region', region.toUpperCase())
    .gte('snapshot_time', startOfDay.toISO())
    .lt('snapshot_time', endOfDay.toISO())
    .order('snapshot_time', { ascending: true });

  if (error || !data) {
    console.error('Supabase fetch error:', error);
    return [];
  }

  // Transform data to match expected format
  const transformed = (data || []).map((entry: any) => ({
    player_name: entry.players.player_name,
    rating: entry.rating,
    snapshot_time: entry.snapshot_time,
    region: entry.region,
  }));

  // No need for dedup logic since the new table doesn't have consecutive duplicate ratings
  return transformed;
}