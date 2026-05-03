import { DateTime } from 'luxon';

import { estimatePlacement } from '@/utils/calculatePlacements';

const PACIFIC = 'America/Los_Angeles';

export interface SnapshotRowForGames {
  snapshot_time: string;
  rating: number;
  region: string;
  game_mode: string;
  id?: string;
}

export interface GameRecordRow {
  rowKey: string;
  recordedAt: string;
  placement: number;
  deltaMmr: number;
  endingMmr: number;
}

function stableEndSnapshotKey(end: SnapshotRowForGames): string {
  if (end.id) {
    return end.id;
  }
  return `${end.snapshot_time}|${end.region}|${end.game_mode}|${end.rating}`;
}

export function buildGameRecordsFromSnapshots(
  snapshots: SnapshotRowForGames[]
): GameRecordRow[] {
  if (snapshots.length < 2) {
    return [];
  }

  const sorted = [...snapshots].sort(
    (a, b) =>
      new Date(a.snapshot_time).getTime() -
      new Date(b.snapshot_time).getTime()
  );

  const rows: GameRecordRow[] = [];

  for (let i = 0; i < sorted.length - 1; i += 1) {
    const start = sorted[i];
    const end = sorted[i + 1];
    const deltaMmr = end.rating - start.rating;
    const { placement } = estimatePlacement(start.rating, end.rating);

    rows.push({
      rowKey: stableEndSnapshotKey(end),
      recordedAt: end.snapshot_time,
      placement,
      deltaMmr,
      endingMmr: end.rating,
    });
  }

  rows.sort(
    (a, b) =>
      new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime()
  );

  return rows;
}

export function formatRecordedAt(isoTime: string): string {
  const at = DateTime.fromISO(isoTime, { setZone: true });
  if (!at.isValid) {
    return '—';
  }

  const now = DateTime.now();
  const diffMs = now.diff(at).as('milliseconds');
  const diffMins = Math.floor(diffMs / 60_000);
  const diffHours = Math.floor(diffMs / 3_600_000);

  if (diffMs < 0) {
    return at.setZone(PACIFIC).toFormat('MMM d, h:mm a');
  }

  if (diffMins < 1) {
    return 'just now';
  }

  if (diffMins < 60) {
    return `${diffMins} min ago`;
  }

  if (diffHours < 24) {
    return `${diffHours} hr ago`;
  }

  return at.setZone(PACIFIC).toFormat('MMM d, h:mm a');
}
