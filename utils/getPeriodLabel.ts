import { DateTime } from 'luxon';

export default function getPeriodLabel(period: string, offset: number): string {
  const now = DateTime.now();

  if (period === 'day') {
    const day = now.minus({ days: offset }).toFormat('MMMM d, yyyy');
    return day;
  }

  if (period === 'week') {
    const start = now.minus({ weeks: offset }).startOf('week');
    const end = start.plus({ days: 6 });
    return `${start.toFormat('MMM d')}–${end.toFormat('MMM d, yyyy')}`;
  }

  return '';
}