'use client';

import type { ColumnDef } from '@tanstack/react-table';
import type { GameRecordRow } from '@/utils/buildGameRecordsFromSnapshots';
import { formatRecordedAt } from '@/utils/formatRecordedAt';

function formatSignedDelta(delta: number): string {
  if (!Number.isFinite(delta)) return '—';
  if (delta === 0) return '0';
  return `${delta > 0 ? '+' : ''}${Math.round(delta)}`;
}

function formatPlacementPlain(value: number): string {
  if (!Number.isFinite(value)) return '—';
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

export const gameRecordsColumns: ColumnDef<GameRecordRow>[] = [
  {
    id: 'recordedAt',
    accessorKey: 'recordedAt',
    header: 'Recorded At',
    cell: ({ row }) => formatRecordedAt(row.original.recordedAt),
    meta: {
      variant: 'emphasis',
    },
  },
  {
    id: 'placement',
    accessorKey: 'placement',
    header: 'Placement (est.)',
    cell: ({ row }) => formatPlacementPlain(row.original.placement),
  },
  {
    id: 'deltaMmr',
    accessorKey: 'deltaMmr',
    header: 'Δ MMR',
    cell: ({ row }) => formatSignedDelta(row.original.deltaMmr),
    meta: {
      cellClassName: (row: GameRecordRow) =>
        row.deltaMmr > 0
          ? 'font-medium text-success'
          : row.deltaMmr < 0
            ? 'font-medium text-destructive'
            : 'font-medium text-muted-foreground',
    },
  },
  {
    id: 'endingMmr',
    accessorKey: 'endingMmr',
    header: 'Ending MMR',
    cell: ({ row }) => (Number.isFinite(row.original.endingMmr) ? Math.round(row.original.endingMmr) : '—'),
    meta: {
      variant: 'emphasis',
    },
  },
];
