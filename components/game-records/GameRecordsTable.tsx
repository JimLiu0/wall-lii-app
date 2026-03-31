'use client';

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

export interface GameRecordsTableProps {
  rows: GameRecordRow[];
  compactTime?: boolean;
}

export default function GameRecordsTable({
  rows,
  compactTime = false,
}: GameRecordsTableProps) {
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
          {rows.map((row) => (
            <tr
              key={row.rowKey}
              className="border-b border-gray-800 hover:bg-gray-800/50 transition-colors"
            >
              <td className="px-4 py-3 text-zinc-400 whitespace-nowrap">
                {formatRecordedAt(row.recordedAt, { compact: compactTime })}
              </td>
              <td className="px-4 py-3 text-white">
                {formatPlacementPlain(row.placement)}
              </td>
              <td
                className={`px-4 py-3 font-medium ${
                  row.deltaMmr > 0
                    ? 'text-emerald-400'
                    : row.deltaMmr < 0
                      ? 'text-red-400'
                      : 'text-zinc-400'
                }`}
              >
                {formatSignedDelta(row.deltaMmr)}
              </td>
              <td className="px-4 py-3 text-left font-semibold text-white">
                {Number.isFinite(row.endingMmr) ? Math.round(row.endingMmr) : '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
