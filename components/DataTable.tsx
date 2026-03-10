'use client';

import { ReactNode } from 'react';

export interface DataTableColumn<T> {
  key: string;
  label: ReactNode;
  sortKey?: string;
  render: (row: T) => ReactNode;
  sticky?: boolean;
  headerClassName?: string;
  cellClassName?: string;
}

interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  data: T[];
  getRowKey: (row: T) => string;
  sortColumn?: string;
  sortAsc?: boolean;
  onSort?: (key: string) => void;
  emptyMessage?: ReactNode;
  footer?: ReactNode;
}

export default function DataTable<T>({
  columns,
  data,
  getRowKey,
  sortColumn,
  sortAsc = true,
  onSort,
  emptyMessage = 'No results.',
  footer,
}: DataTableProps<T>) {
  const handleSort = (col: DataTableColumn<T>) => {
    const key = col.sortKey ?? col.key;
    if (onSort) {
      if (sortColumn === key) {
        onSort(key);
      } else {
        onSort(key);
      }
    }
  };

  if (data.length === 0) {
    return (
      <div className="overflow-x-auto">
        <div className="py-8 text-center text-sm font-medium text-zinc-400">
          {emptyMessage}
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="text-sm font-medium text-zinc-400 border-b border-gray-800">
            {columns.map((col) => {
              const isSorted = sortColumn === (col.sortKey ?? col.key);
              const sortable = onSort != null && (col.sortKey != null || col.key != null);
              const thClass = [
                'px-4 py-2 text-left',
                col.sticky && 'sticky left-0 bg-gray-900 z-10',
                sortable && 'cursor-pointer',
                col.headerClassName,
              ]
                .filter(Boolean)
                .join(' ');
              return (
                <th
                  key={col.key}
                  scope="col"
                  className={thClass}
                  onClick={sortable ? () => handleSort(col) : undefined}
                >
                  {col.label}
                  {sortable && isSorted && (sortAsc ? ' ▲' : ' ▼')}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {data.map((row) => (
            <tr
              key={getRowKey(row)}
              className="border-b border-gray-800 hover:bg-gray-800/50 transition-colors"
            >
              {columns.map((col) => {
                const tdClass = [
                  'px-4 py-3 text-left',
                  col.sticky && 'sticky left-0 bg-gray-900',
                  col.cellClassName,
                ]
                  .filter(Boolean)
                  .join(' ');
                return (
                  <td key={col.key} className={tdClass}>
                    {col.render(row)}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      {footer != null ? footer : null}
    </div>
  );
}
