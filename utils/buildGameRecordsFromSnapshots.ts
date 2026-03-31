import { estimatePlacement } from '@/utils/calculatePlacements';

export interface SnapshotRowForGames {
  snapshot_time: string;
  rating: number;
  region: string;
  game_mode: string;
  /** Stable row id from leaderboard_snapshots when available */
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

/**
 * Builds one row per consecutive snapshot pair (chronological), matching
 * chart placement estimates. Expects snapshots already filtered/deduped for
 * region, mode, and timeframe.
 */
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

  for (let i = 0; i < sorted.length - 1; i++) {
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
