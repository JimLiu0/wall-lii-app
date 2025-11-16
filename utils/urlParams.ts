import { DateTime } from 'luxon';

/**
 * Checks if URL parameters are in the old format
 */
export function hasOldFormat(searchParams: {
  r?: string;
  g?: string;
  v?: string;
  o?: string;
  region?: string;
  mode?: string;
  view?: string;
  date?: string;
}): boolean {
  // If any old format params are present, it's old format
  return !!(searchParams.r || searchParams.g || searchParams.v || searchParams.o !== undefined);
}

/**
 * Converts old URL parameters to new format
 * Old: r, g, v, o
 * New: region, mode, view, date
 */
export function normalizeUrlParams(searchParams: {
  r?: string;
  g?: string;
  v?: string;
  o?: string;
  region?: string;
  mode?: string;
  view?: string;
  date?: string;
}): {
  region: string;
  mode: 'solo' | 'duo';
  view: 'all' | 'week' | 'day';
  date: string | null;
  offset: number;
} {
  // Prefer new params, fall back to old params for backwards compatibility
  const region = searchParams.region || searchParams.r || 'all';
  
  // Convert mode: 'solo'/'duo' or 's'/'d' -> 'solo'/'duo'
  let mode: 'solo' | 'duo' = 'solo';
  if (searchParams.mode) {
    mode = searchParams.mode.toLowerCase() === 'duo' ? 'duo' : 'solo';
  } else if (searchParams.g) {
    mode = searchParams.g.toLowerCase() === 'd' ? 'duo' : 'solo';
  }
  
  // Convert view: 'all'/'week'/'day' or 's'/'w'/'d' -> 'all'/'week'/'day'
  let view: 'all' | 'week' | 'day' = 'all';
  if (searchParams.view) {
    const viewLower = searchParams.view.toLowerCase();
    if (viewLower === 'week' || viewLower === 'day') {
      view = viewLower;
    } else {
      view = 'all';
    }
  } else if (searchParams.v) {
    const vLower = searchParams.v.toLowerCase();
    if (vLower === 'w') {
      view = 'week';
    } else if (vLower === 'd') {
      view = 'day';
    } else {
      view = 'all';
    }
  }
  
  // Convert date or offset to both date and offset
  let date: string | null = null;
  let offset = 0;
  
  const ptNow = DateTime.now().setZone('America/Los_Angeles');
  
  if (searchParams.date) {
    // New format: date parameter (ISO date string)
    try {
      // Parse date as if it's in PST timezone to avoid timezone shifts
      // fromISO without time creates date at local midnight, so we need to
      // explicitly set it in PST timezone from the start
      const parsedDate = DateTime.fromISO(searchParams.date, { zone: 'America/Los_Angeles' }).startOf('day');
      if (parsedDate.isValid) {
        date = parsedDate.toISODate();
        // Calculate offset from date
        if (view === 'day') {
          offset = Math.max(0, Math.floor(ptNow.startOf('day').diff(parsedDate.startOf('day'), 'days').days));
        } else if (view === 'week') {
          offset = Math.max(0, Math.floor(ptNow.startOf('week').startOf('day').diff(parsedDate.startOf('week').startOf('day'), 'weeks').weeks));
        }
      }
    } catch (e) {
      // Invalid date, fall through to offset calculation
    }
  }
  
  if (!date && searchParams.o !== undefined) {
    // Old format: offset parameter
    offset = parseInt(searchParams.o, 10);
    if (isNaN(offset) || offset < 0) {
      offset = 0;
    }
    
    // Calculate date from offset
    if (view === 'day') {
      const targetDate = ptNow.minus({ days: offset }).startOf('day');
      date = targetDate.toISODate();
    } else if (view === 'week') {
      const targetDate = ptNow.minus({ weeks: offset }).startOf('week').startOf('day');
      date = targetDate.toISODate();
    }
  }
  
  // If no date or offset specified, default to today
  if (!date && view !== 'all') {
    if (view === 'day') {
      date = ptNow.startOf('day').toISODate();
    } else if (view === 'week') {
      date = ptNow.startOf('week').startOf('day').toISODate();
    }
  }
  
  return { region, mode, view, date, offset };
}

/**
 * Converts normalized params to new URL format
 */
export function toNewUrlParams(params: {
  region: string;
  mode: 'solo' | 'duo';
  view: 'all' | 'week' | 'day';
  date: string | null;
}): URLSearchParams {
  const urlParams = new URLSearchParams();
  urlParams.set('region', params.region);
  urlParams.set('mode', params.mode);
  urlParams.set('view', params.view);
  if (params.date && params.view !== 'all') {
    urlParams.set('date', params.date);
  }
  return urlParams;
}

