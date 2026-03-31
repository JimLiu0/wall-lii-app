import { DateTime } from 'luxon';

const PACIFIC = 'America/Los_Angeles';

/**
 * Formats a snapshot / event time for the game records table:
 * - under 1 min: "just now"
 * - under 1 hr: "X min ago" (or compact "Xm")
 * - under 24 hr: "X hr ago" (or compact "Xh")
 * - else: compact Pacific absolute, e.g. "Mar 30, 7:42 PM"
 */
export function formatRecordedAt(
  isoTime: string,
  options?: { compact?: boolean }
): string {
  const at = DateTime.fromISO(isoTime, { setZone: true });
  if (!at.isValid) {
    return '—';
  }

  const now = DateTime.now();
  const diffMs = now.diff(at).as('milliseconds');
  const diffMins = Math.floor(diffMs / 60_000);
  const diffHours = Math.floor(diffMs / 3_600_000);

  if (diffMs < 0) {
    return at.setZone(PACIFIC).toFormat('MMM d, h:mm a');
  }

  if (diffMins < 1) {
    return 'just now';
  }

  if (diffMins < 60) {
    return options?.compact ? `${diffMins}m` : `${diffMins} min ago`;
  }

  if (diffHours < 24) {
    return options?.compact ? `${diffHours}h` : `${diffHours} hr ago`;
  }

  return at.setZone(PACIFIC).toFormat('MMM d, h:mm a');
}
