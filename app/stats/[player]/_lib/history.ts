import { DateTime } from 'luxon';
import { supabase } from '@/utils/supabaseClient';
import type { SnapshotPoint } from './data';

export interface HistorySelection {
  region: string;
  mode: 'solo' | 'duo';
  view: 'all' | 'week' | 'day';
  date: string | null;
}

export function getHistoryWindow(selection: HistorySelection) {
  if (selection.view === 'all') return null;
  const date = selection.date
    ? DateTime.fromISO(selection.date, { zone: 'America/Los_Angeles' })
    : DateTime.now().setZone('America/Los_Angeles');
  if (!date.isValid) throw new Error('Invalid history date');
  const start = selection.view === 'week' ? date.startOf('week') : date.startOf('day');
  const end = selection.view === 'week' ? start.plus({ weeks: 1 }) : start.plus({ days: 1 });
  return { start: start.toUTC().toISO()!, end: end.toUTC().toISO()! };
}

export function historyKey(selection: HistorySelection) {
  const window = getHistoryWindow(selection);
  return `${selection.region}-${selection.mode}-${selection.view}-${window?.start ?? 'season'}`;
}

export async function fetchProfileHistory(
  playerId: string,
  player: string,
  selection: HistorySelection,
  signal?: AbortSignal,
): Promise<SnapshotPoint[]> {
  const window = getHistoryWindow(selection);
  const query = () => {
    const request = supabase.from('leaderboard_snapshots')
      .select('rating, snapshot_time, region, game_mode')
      .eq('player_id', playerId)
      .eq('region', selection.region.toUpperCase())
      .eq('game_mode', selection.mode === 'duo' ? '1' : '0');
    return signal ? request.abortSignal(signal) : request;
  };
  const rows: SnapshotPoint[] = [];
  const pageSize = 1000;
  const end = window?.end ?? new Date().toISOString();
  for (let offset = 0; ; offset += pageSize) {
    let request = query().order('snapshot_time', { ascending: true })
      .order('rating', { ascending: true }).lte('snapshot_time', end)
      .range(offset, offset + pageSize - 1);
    if (window) request = request.gte('snapshot_time', window.start);
    const { data, error } = await request;
    if (error) throw error;
    rows.push(...data.map(row => ({ ...row, player_name: player })));
    if (data.length < pageSize) break;
  }

  if (window) {
    const previous = await query().lt('snapshot_time', window.start)
      .order('snapshot_time', { ascending: false }).limit(1);
    if (previous.error) throw previous.error;
    let baseline = previous.data[0];
    // Preserve the original start time of the preceding constant-rating run.
    // Empty periods retain the nearest previous snapshot, as before.
    if (baseline && rows.length) {
      const changed = await query().lt('snapshot_time', window.start).neq('rating', baseline.rating)
        .order('snapshot_time', { ascending: false }).limit(1);
      if (changed.error) throw changed.error;
      let first = query().lt('snapshot_time', window.start).eq('rating', baseline.rating)
        .order('snapshot_time', { ascending: true }).limit(1);
      if (changed.data[0]) first = first.gt('snapshot_time', changed.data[0].snapshot_time);
      const start = await first;
      if (start.error) throw start.error;
      baseline = start.data[0] ?? baseline;
    }
    if (baseline) rows.unshift({ ...baseline, player_name: player });
  }
  return rows;
}
