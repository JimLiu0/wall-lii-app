/**
 * Integer ordinals: 1st, 2nd, 3rd, 4th, …
 * Non-integers (estimated placement): show one decimal, e.g. "3.5"
 */
export function formatPlacementOrdinal(placement: number): string {
  if (!Number.isFinite(placement)) {
    return '—';
  }

  if (!Number.isInteger(placement)) {
    return placement.toFixed(1);
  }

  const n = Math.abs(placement);
  const lastTwo = n % 100;
  const last = n % 10;
  if (lastTwo >= 11 && lastTwo <= 13) {
    return `${placement}th`;
  }
  switch (last) {
    case 1:
      return `${placement}st`;
    case 2:
      return `${placement}nd`;
    case 3:
      return `${placement}rd`;
    default:
      return `${placement}th`;
  }
}

export function formatSignedMmrDelta(delta: number): string {
  if (!Number.isFinite(delta)) {
    return '—';
  }
  if (delta === 0) {
    return '0';
  }
  const sign = delta > 0 ? '+' : '';
  return `${sign}${Math.round(delta)}`;
}

export function formatMmrInteger(value: number): string {
  if (!Number.isFinite(value)) {
    return '—';
  }
  return Math.round(value).toLocaleString('en-US');
}
