'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import GameRecordsTable from '@/components/game-records/GameRecordsTable';
import { useGameRecordsPaginated } from '@/hooks/useGameRecordsPaginated';
import type { SnapshotRowForGames } from '@/utils/buildGameRecordsFromSnapshots';

const PAGE_SIZE = 25;

function useCompactRecordedAt() {
  const [compact, setCompact] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 640px)');
    const update = () => setCompact(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

  return compact;
}

/** Re-render periodically so relative labels stay reasonably fresh */
function useRelativeTimeRerender(intervalMs = 60_000) {
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => {
      setTick((t) => t + 1);
    }, intervalMs);
    return () => window.clearInterval(id);
  }, [intervalMs]);
}

function TableSkeleton() {
  return (
    <div className="w-full overflow-x-auto rounded-lg border border-gray-800 bg-gray-950/50">
      <table className="w-full min-w-[520px] text-left text-sm">
        <thead>
          <tr className="border-b border-gray-800 text-xs font-semibold uppercase tracking-wide text-gray-400">
            <th className="px-3 py-2.5 sm:px-4 sm:py-3">Recorded At</th>
            <th className="px-3 py-2.5 sm:px-4 sm:py-3 whitespace-nowrap">
              Placement (est.)
            </th>
            <th className="px-3 py-2.5 sm:px-4 sm:py-3">Δ MMR</th>
            <th className="px-3 py-2.5 sm:px-4 sm:py-3 text-right">Ending MMR</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-800/80">
          {Array.from({ length: 8 }).map((_, i) => (
            <tr key={i} className="animate-pulse">
              <td className="px-3 py-2.5 sm:px-4 sm:py-3">
                <div className="h-4 rounded bg-gray-800/90" />
              </td>
              <td className="px-3 py-2.5 sm:px-4 sm:py-3">
                <div className="h-4 w-12 rounded bg-gray-800/90" />
              </td>
              <td className="px-3 py-2.5 sm:px-4 sm:py-3">
                <div className="h-4 w-10 rounded bg-gray-800/90" />
              </td>
              <td className="px-3 py-2.5 sm:px-4 sm:py-3 text-right">
                <div className="ml-auto h-4 w-14 rounded bg-gray-800/90" />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export interface GameRecordsSectionProps {
  /** When this value changes, pagination resets to page 1 */
  filterKey: string;
  snapshots: SnapshotRowForGames[];
  isLoading?: boolean;
  error?: string | null;
}

export default function GameRecordsSection({
  filterKey,
  snapshots,
  isLoading = false,
  error = null,
}: GameRecordsSectionProps) {
  const [page, setPage] = useState(1);
  const compactTime = useCompactRecordedAt();
  useRelativeTimeRerender();

  useEffect(() => {
    setPage(1);
  }, [filterKey]);

  const { pageRecords, totalCount, totalPages, safePage } =
    useGameRecordsPaginated(snapshots, page, PAGE_SIZE);

  useEffect(() => {
    if (totalPages > 0 && page > totalPages) {
      setPage(totalPages);
    }
  }, [totalPages, page]);

  const canPrev = safePage > 1 && totalPages > 0;
  const canNext = totalPages > 0 && safePage < totalPages;

  const handlePrev = useCallback(() => {
    setPage((p) => Math.max(1, p - 1));
  }, []);

  const handleNext = useCallback(() => {
    setPage((p) => (totalPages > 0 ? Math.min(totalPages, p + 1) : p));
  }, [totalPages]);

  const paginationLabel = useMemo(() => {
    if (totalCount === 0) {
      return null;
    }
    return `Page ${safePage} of ${totalPages}`;
  }, [totalCount, safePage, totalPages]);

  if (error) {
    return (
      <section className="mt-10 border-t border-gray-800 pt-8">
        <h2 className="text-lg font-semibold text-white sm:text-xl">Game records</h2>
        <p className="mt-4 text-sm text-red-400">Unable to load game records.</p>
      </section>
    );
  }

  if (isLoading) {
    return (
      <section className="mt-10 border-t border-gray-800 pt-8">
        <h2 className="text-lg font-semibold text-white sm:text-xl">Game records</h2>
        <p className="mt-1 text-xs text-gray-500">
          Recent times shown relatively; older times shown in Pacific Time.
        </p>
        <div className="mt-4">
          <TableSkeleton />
        </div>
      </section>
    );
  }

  return (
    <section className="mt-10 border-t border-gray-800 pt-8">
      <h2 className="text-lg font-semibold text-white sm:text-xl">Game records</h2>
      <p className="mt-1 text-xs text-gray-500">
        Recent times shown relatively; older times shown in Pacific Time.
      </p>

      <div className="mt-4">
        {totalCount === 0 ? (
          <p className="rounded-lg border border-gray-800 bg-gray-950/40 px-4 py-8 text-center text-sm text-gray-400">
            No recorded games for this filter.
          </p>
        ) : (
          <>
            <GameRecordsTable rows={pageRecords} compactTime={compactTime} />
            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-gray-500">{paginationLabel}</p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handlePrev}
                  disabled={!canPrev}
                  className="rounded-md border border-gray-700 bg-gray-900 px-3 py-1.5 text-sm text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Previous
                </button>
                <button
                  type="button"
                  onClick={handleNext}
                  disabled={!canNext}
                  className="rounded-md border border-gray-700 bg-gray-900 px-3 py-1.5 text-sm text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
