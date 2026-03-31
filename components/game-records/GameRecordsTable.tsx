'use client';

import type { GameRecordRow } from '@/utils/buildGameRecordsFromSnapshots';
import { formatRecordedAt } from '@/utils/formatRecordedAt';
import {
  formatMmrInteger,
  formatPlacementOrdinal,
  formatSignedMmrDelta,
} from '@/utils/formatGameRecordDisplay';

export interface GameRecordsTableProps {
  rows: GameRecordRow[];
  compactTime?: boolean;
}

export default function GameRecordsTable({
  rows,
  compactTime = false,
}: GameRecordsTableProps) {
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
          {rows.map((row) => (
            <tr key={row.rowKey} className="text-gray-100">
              <td className="px-3 py-2 sm:px-4 sm:py-2.5 font-mono text-xs sm:text-sm text-gray-300 whitespace-nowrap tabular-nums">
                {formatRecordedAt(row.recordedAt, { compact: compactTime })}
              </td>
              <td className="px-3 py-2 sm:px-4 sm:py-2.5 text-gray-200">
                {formatPlacementOrdinal(row.placement)}
              </td>
              <td
                className={`px-3 py-2 sm:px-4 sm:py-2.5 font-mono tabular-nums ${
                  row.deltaMmr > 0
                    ? 'text-emerald-400'
                    : row.deltaMmr < 0
                      ? 'text-red-400'
                      : 'text-gray-300'
                }`}
              >
                {formatSignedMmrDelta(row.deltaMmr)}
              </td>
              <td className="px-3 py-2 sm:px-4 sm:py-2.5 text-right font-mono text-gray-100 tabular-nums">
                {formatMmrInteger(row.endingMmr)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
