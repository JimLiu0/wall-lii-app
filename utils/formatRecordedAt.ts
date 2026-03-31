import { DateTime } from 'luxon';

const PACIFIC = 'America/Los_Angeles';

/**
 * Formats a snapshot / event time for the game records table:
 * - under 1 min: "just now"
 * - under 1 hr: "X min ago"
 * - under 24 hr: "X hr ago"
 * - else: Pacific absolute, e.g. "Mar 30, 7:42 PM"
 */
export function formatRecordedAt(isoTime: string): string {
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
    return `${diffMins} min ago`;
  }

  if (diffHours < 24) {
    return `${diffHours} hr ago`;
  }

  return at.setZone(PACIFIC).toFormat('MMM d, h:mm a');
}
