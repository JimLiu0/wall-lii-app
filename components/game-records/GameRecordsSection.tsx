'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Info } from 'lucide-react';
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

function GameRecordsHeading({
  showTimeInfo,
  onToggleTimeInfo,
}: {
  showTimeInfo: boolean;
  onToggleTimeInfo: () => void;
}) {
  return (
    <>
      <div className="flex gap-2 items-center">
        <h2 className="text-xl font-bold text-white">Game records</h2>
        <Info
          onClick={onToggleTimeInfo}
          className="text-blue-400 hover:text-blue-300 cursor-pointer shrink-0"
        />
      </div>
      {showTimeInfo && (
        <div className="text-xs text-gray-400 mt-2">
          All stats and resets use Pacific Time (PT) midnight as the daily/weekly reset.
        </div>
      )}
    </>
  );
}

function TableSkeleton() {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-[14px] leading-normal">
        <thead>
          <tr className="font-medium text-zinc-400 border-b border-gray-800">
            <th className="px-4 py-2 text-left">Recorded At</th>
            <th className="px-4 py-2 text-left">Placement (est.)</th>
            <th className="px-4 py-2 text-left">Δ MMR</th>
            <th className="px-4 py-2 text-left">Ending MMR</th>
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: 8 }).map((_, i) => (
            <tr key={`sk-${i}`} className="border-b border-gray-800 animate-pulse">
              <td className="px-4 py-3">
                <div className="h-4 rounded bg-gray-800/90" />
              </td>
              <td className="px-4 py-3">
                <div className="h-4 w-10 rounded bg-gray-800/90" />
              </td>
              <td className="px-4 py-3">
                <div className="h-4 w-8 rounded bg-gray-800/90" />
              </td>
              <td className="px-4 py-3">
                <div className="h-4 w-14 rounded bg-gray-800/90" />
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
  const [showTimeInfo, setShowTimeInfo] = useState(false);
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

  const toggleTimeInfo = useCallback(() => {
    setShowTimeInfo((v) => !v);
  }, []);

  if (error) {
    return (
      <div className="mt-6">
        <GameRecordsHeading showTimeInfo={showTimeInfo} onToggleTimeInfo={toggleTimeInfo} />
        <p className="mt-4 text-[14px] text-gray-400">Unable to load game records.</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="mt-6">
        <GameRecordsHeading showTimeInfo={showTimeInfo} onToggleTimeInfo={toggleTimeInfo} />
        <div className="mt-4">
          <TableSkeleton />
        </div>
      </div>
    );
  }

  return (
    <div className="mt-6">
      <GameRecordsHeading showTimeInfo={showTimeInfo} onToggleTimeInfo={toggleTimeInfo} />

      <div className="mt-4">
        {totalCount === 0 ? (
          <div className="text-center text-[14px] text-gray-400 py-8">
            <p>No recorded games for this filter.</p>
          </div>
        ) : (
          <>
            <GameRecordsTable rows={pageRecords} compactTime={compactTime} />
            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-[14px] text-gray-400">{paginationLabel}</p>
              <div className="flex gap-2 justify-center sm:justify-end">
                <button
                  type="button"
                  onClick={handlePrev}
                  disabled={!canPrev}
                  className="rounded-md border border-gray-700 bg-gray-900 px-3 py-1.5 text-[14px] text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Previous
                </button>
                <button
                  type="button"
                  onClick={handleNext}
                  disabled={!canNext}
                  className="rounded-md border border-gray-700 bg-gray-900 px-3 py-1.5 text-[14px] text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
