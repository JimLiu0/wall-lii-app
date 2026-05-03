'use client';

import {
  flexRender,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { gameRecordsColumns } from './gameRecordsColumns';
import type { GameRecordRow } from '@/utils/buildGameRecordsFromSnapshots';

export interface GameRecordsTableProps {
  rows: GameRecordRow[];
}

export default function GameRecordsTable({ rows }: GameRecordsTableProps) {
  const table = useReactTable({
    data: rows,
    columns: gameRecordsColumns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <Table>
      <TableHeader>
        {table.getHeaderGroups().map((headerGroup) => (
          <TableRow key={headerGroup.id}>
            {headerGroup.headers.map((header) => (
              <TableHead key={header.id}>
                {header.isPlaceholder
                  ? null
                  : flexRender(header.column.columnDef.header, header.getContext())}
              </TableHead>
            ))}
          </TableRow>
        ))}
      </TableHeader>
      <TableBody>
        {table.getRowModel().rows.map((row) => (
          <TableRow key={row.original.rowKey}>
            {row.getVisibleCells().map((cell) => {
              const meta = cell.column.columnDef.meta as
                | {
                    variant?: 'default' | 'emphasis';
                    cellClassName?: string | ((row: GameRecordRow) => string);
                  }
                | undefined;
              const cellClassName =
                typeof meta?.cellClassName === 'function'
                  ? meta.cellClassName(row.original)
                  : meta?.cellClassName;

              return (
                <TableCell
                  key={cell.id}
                  variant={meta?.variant ?? 'default'}
                  className={cellClassName}
                >
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </TableCell>
              );
            })}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
