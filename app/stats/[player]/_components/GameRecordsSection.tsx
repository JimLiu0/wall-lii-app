'use client';

import { useCallback, useEffect, useId, useState, type ReactNode } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from 'lucide-react';
import GameRecordsTable from './GameRecordsTable';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useGameRecordsPaginated } from '../_hooks/useGameRecordsPaginated';
import type { SnapshotRowForGames } from '../_lib/gameRecords';

const PAGE_SIZE = 25;

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
    <div className="flex flex-wrap items-center justify-center gap-x-1 gap-y-2 text-sm text-muted-foreground">
      <Button
        type="button"
        variant="outline"
        size="icon-lg"
        aria-label="First page"
        onClick={onFirstPage}
        disabled={!canFirst}
      >
        <ChevronsLeft className="h-4 w-4" aria-hidden />
      </Button>
      <Button
        type="button"
        variant="outline"
        size="icon-lg"
        aria-label="Previous page"
        onClick={onPrev}
        disabled={!canPrev}
      >
        <ChevronLeft className="h-4 w-4" aria-hidden />
      </Button>

      <span className="flex flex-wrap items-center justify-center gap-2 px-1">
        <span>Page</span>
        <label htmlFor={inputId} className="sr-only">
          Page number (1 to {totalPages})
        </label>
        <Input
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
          className="h-8 min-h-8 w-14 bg-background px-2 py-1 text-center text-sm text-foreground tabular-nums"
        />
        <span>of {totalPages}</span>
      </span>

      <Button
        type="button"
        variant="outline"
        size="icon-lg"
        aria-label="Next page"
        onClick={onNext}
        disabled={!canNext}
      >
        <ChevronRight className="h-4 w-4" aria-hidden />
      </Button>
      <Button
        type="button"
        variant="outline"
        size="icon-lg"
        aria-label="Last page"
        onClick={onLastPage}
        disabled={!canLast}
      >
        <ChevronsRight className="h-4 w-4" aria-hidden />
      </Button>
    </div>
  );
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

function StateMessage({ children }: { children: ReactNode }) {
  return <div className="py-8 text-center text-sm text-muted-foreground">{children}</div>;
}

function TableSkeleton() {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Recorded At</TableHead>
          <TableHead>Placement (est.)</TableHead>
          <TableHead>Δ MMR</TableHead>
          <TableHead>Ending MMR</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {Array.from({ length: 8 }).map((_, i) => (
          <TableRow key={`sk-${i}`} hover="none" className="animate-pulse">
            <TableCell>
              <div className="h-4 rounded bg-muted/70" />
            </TableCell>
            <TableCell>
              <div className="h-4 w-10 rounded bg-muted/70" />
            </TableCell>
            <TableCell>
              <div className="h-4 w-8 rounded bg-muted/70" />
            </TableCell>
            <TableCell>
              <div className="h-4 w-14 rounded bg-muted/70" />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
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

  let content: ReactNode;
  if (error) {
    content = <StateMessage>Unable to load game records.</StateMessage>;
  } else if (isLoading) {
    content = <TableSkeleton />;
  } else if (totalCount === 0) {
    content = <StateMessage>No recorded games for this filter.</StateMessage>;
  } else {
    content = (
      <>
        <GameRecordsPaginationBar {...paginationBarProps} />
        <div className="mt-4">
          <GameRecordsTable rows={pageRecords} />
        </div>
        <div className="mt-4">
          <GameRecordsPaginationBar {...paginationBarProps} />
        </div>
      </>
    );
  }

  return (
    <div className="mt-6">
      {content}
    </div>
  );
}
