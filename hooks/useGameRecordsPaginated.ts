import { useMemo } from 'react';
import {
  buildGameRecordsFromSnapshots,
  type SnapshotRowForGames,
} from '@/utils/buildGameRecordsFromSnapshots';

const DEFAULT_PAGE_SIZE = 25;

export function useGameRecordsPaginated(
  snapshots: SnapshotRowForGames[],
  page: number,
  pageSize: number = DEFAULT_PAGE_SIZE
) {
  const allRecords = useMemo(
    () => buildGameRecordsFromSnapshots(snapshots),
    [snapshots]
  );

  const totalCount = allRecords.length;
  const totalPages =
    totalCount === 0 ? 0 : Math.ceil(totalCount / pageSize);
  const safePage =
    totalPages === 0 ? 1 : Math.min(Math.max(1, page), totalPages);

  const pageRecords = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return allRecords.slice(start, start + pageSize);
  }, [allRecords, safePage, pageSize]);

  return {
    pageRecords,
    totalCount,
    totalPages,
    safePage,
    pageSize,
  };
}
