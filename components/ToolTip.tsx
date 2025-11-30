import { DateTime } from 'luxon';

interface PayloadData {
  rating: number;
  prevRating: number | null;
  snapshot_time: string;
  placement: number | null;
}

interface TooltipProps {
  active?: boolean;
  payload?: { value: number; payload: PayloadData }[];
  label?: string;
}

export default function RatingTooltip({ active, payload }: TooltipProps) {
  if (!active || !payload || payload.length === 0) return null;

  const point = payload[0].payload;
  const current = point.rating;
  const prev = point.prevRating;
  const placement = point.placement;

  const delta = prev !== null && prev !== undefined ? current - prev : null;

  const deltaText =
    delta === null
      ? ''
      : delta > 0
      ? `+${delta}`
      : delta < 0
      ? `${delta}`
      : '±0';

  const deltaColor =
    delta === null ? 'text-gray-400' : delta > 0 ? 'text-green-400' : delta < 0 ? 'text-red-400' : 'text-gray-400';

  const local = DateTime.fromISO(point.snapshot_time).toLocal();
  const timeLabel = local.toFormat('ccc, MMM d – HH:mm ZZZZ'); // e.g. Mon, Apr 15 – 22:45 PDT

  return (
    <div className="bg-white text-black p-3 rounded shadow-md space-y-1">
      <div className="font-medium">{timeLabel}</div>
      <div className="text-sm">
        Rating: <span className="font-mono">{current}</span>{' '}
        <span className={`ml-1 font-mono ${deltaColor}`}>{deltaText}</span>
      </div>
      {placement !== null && placement !== undefined && (
        <div className="text-sm">
          Placement: <span className="font-mono">{placement}</span>
        </div>
      )}
    </div>
  );
}