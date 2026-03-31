'use client';

import { useCallback, useEffect, useId, useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Info,
} from 'lucide-react';
import GameRecordsTable from '@/components/game-records/GameRecordsTable';
import { useGameRecordsPaginated } from '@/hooks/useGameRecordsPaginated';
import type { SnapshotRowForGames } from '@/utils/buildGameRecordsFromSnapshots';

const PAGE_SIZE = 25;

const paginationIconBtnClass =
  'inline-flex shrink-0 items-center justify-center rounded-md border border-gray-700 bg-gray-900 p-2 text-zinc-300 transition hover:bg-gray-800 hover:text-white disabled:cursor-not-allowed disabled:opacity-40';

function GameRecordsPaginationBar({
  totalPages,
  pageDraft,
  onPageDraftChange,
  onCommitPageDraft,
  onFirstPage,
  onLastPage,
  onPrev,
  onNext,
  canPrev,
  canNext,
  canFirst,
  canLast,
}: {
  totalPages: number;
  pageDraft: string;
  onPageDraftChange: (value: string) => void;
  onCommitPageDraft: () => void;
  onFirstPage: () => void;
  onLastPage: () => void;
  onPrev: () => void;
  onNext: () => void;
  canPrev: boolean;
  canNext: boolean;
  canFirst: boolean;
  canLast: boolean;
}) {
  const inputId = useId();

  return (
    <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-2 text-[14px] text-gray-400">
      <button
        type="button"
        aria-label="First page"
        onClick={onFirstPage}
        disabled={!canFirst}
        className={paginationIconBtnClass}
      >
        <ChevronsLeft className="h-4 w-4" aria-hidden />
      </button>
      <button
        type="button"
        aria-label="Previous page"
        onClick={onPrev}
        disabled={!canPrev}
        className={paginationIconBtnClass}
      >
        <ChevronLeft className="h-4 w-4" aria-hidden />
      </button>

      <span className="flex flex-wrap items-center justify-center gap-2 px-1">
        <span>Page</span>
        <label htmlFor={inputId} className="sr-only">
          Page number (1 to {totalPages})
        </label>
        <input
          id={inputId}
          type="text"
          inputMode="numeric"
          autoComplete="off"
          value={pageDraft}
          onChange={(e) => onPageDraftChange(e.target.value.replace(/\D/g, ''))}
          onBlur={onCommitPageDraft}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              onCommitPageDraft();
            }
          }}
          disabled={totalPages < 1}
          className="w-14 rounded border border-gray-700 bg-gray-900 px-2 py-1 text-center text-[14px] text-white tabular-nums disabled:opacity-40"
        />
        <span>of {totalPages}</span>
      </span>

      <button
        type="button"
        aria-label="Next page"
        onClick={onNext}
        disabled={!canNext}
        className={paginationIconBtnClass}
      >
        <ChevronRight className="h-4 w-4" aria-hidden />
      </button>
      <button
        type="button"
        aria-label="Last page"
        onClick={onLastPage}
        disabled={!canLast}
        className={paginationIconBtnClass}
      >
        <ChevronsRight className="h-4 w-4" aria-hidden />
      </button>
    </div>
  );
}

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
        <h2 className="text-xl font-bold text-white">Game Records</h2>
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
  const [pageDraft, setPageDraft] = useState('1');
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

  useEffect(() => {
    setPageDraft(String(safePage));
  }, [safePage]);

  const canPrev = safePage > 1 && totalPages > 0;
  const canNext = totalPages > 0 && safePage < totalPages;
  const canNewest = totalPages > 0 && safePage > 1;
  const canOldest = totalPages > 0 && safePage < totalPages;

  const handlePrev = useCallback(() => {
    setPage((p) => Math.max(1, p - 1));
  }, []);

  const handleNext = useCallback(() => {
    setPage((p) => (totalPages > 0 ? Math.min(totalPages, p + 1) : p));
  }, [totalPages]);

  const handleNewest = useCallback(() => {
    setPage(1);
  }, []);

  const handleOldest = useCallback(() => {
    if (totalPages > 0) setPage(totalPages);
  }, [totalPages]);

  const commitPageDraft = useCallback(() => {
    if (totalPages < 1) {
      setPageDraft(String(safePage));
      return;
    }
    const n = parseInt(pageDraft, 10);
    if (pageDraft === '' || !Number.isFinite(n)) {
      setPageDraft(String(safePage));
      return;
    }
    setPage(Math.min(Math.max(1, n), totalPages));
  }, [pageDraft, safePage, totalPages]);

  const paginationBarProps = {
    totalPages,
    pageDraft,
    onPageDraftChange: setPageDraft,
    onCommitPageDraft: commitPageDraft,
    onFirstPage: handleNewest,
    onLastPage: handleOldest,
    onPrev: handlePrev,
    onNext: handleNext,
    canPrev,
    canNext,
    canFirst: canNewest,
    canLast: canOldest,
  };

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
            <GameRecordsPaginationBar {...paginationBarProps} />
            <div className="mt-4">
              <GameRecordsTable rows={pageRecords} compactTime={compactTime} />
            </div>
            <div className="mt-4">
              <GameRecordsPaginationBar {...paginationBarProps} />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
