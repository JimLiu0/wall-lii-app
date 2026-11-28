// Dynamic season rating cap. Keep in sync with the bot (config.py: RATING_CAP_*,
// src/utils/placement_utils.py: get_rating_cap).
const RATING_CAP_SEASON_START_MS = Date.UTC(2026, 7, 5); // 2026-08-05 00:00 UTC
const RATING_CAP_START = 8500;
const RATING_CAP_STEP_PER_DAY = 50;
const RATING_CAP_MAX = 12500;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

export type PlacementTimestamp = string | number | Date | null | undefined;

// Convert a timestamp to UTC milliseconds. A string without an offset is read as
// UTC (never local time). A missing or invalid timestamp falls back to the current
// time, like the bot.
function toUtcMs(timestamp: PlacementTimestamp): number {
  let ms = NaN;
  if (typeof timestamp === 'string') {
    let iso = timestamp.trim().replace(' ', 'T');
    const timePart = iso.split('T')[1];
    if (timePart !== undefined) {
      if (/[+-]\d{2}$/.test(timePart)) iso += ':00'; // "+00" -> "+00:00"
      else if (!/(Z|[+-]\d{2}:?\d{2})$/i.test(timePart)) iso += 'Z'; // no offset -> UTC
    }
    ms = Date.parse(iso);
  } else if (timestamp !== null && timestamp !== undefined) {
    ms = new Date(timestamp).getTime();
  }
  return Number.isNaN(ms) ? Date.now() : ms;
}

// Rating cap for opponents' average rating: grows in whole steps per full UTC day
// since the season start. min(12500, 8500 + 50 * floor(elapsed days)).
export function getRatingCap(timestamp?: PlacementTimestamp): number {
  const elapsedDays = Math.floor((toUtcMs(timestamp) - RATING_CAP_SEASON_START_MS) / MS_PER_DAY);
  return Math.min(
    RATING_CAP_MAX,
    RATING_CAP_START + RATING_CAP_STEP_PER_DAY * Math.max(0, elapsedDays),
  );
}

// Estimate most likely placement given start and end MMR.
// timestamp is the time the rating change was observed (the ending snapshot)
// and decides the rating cap. It defaults to the current time.
export function estimatePlacement(start: number, end: number, timestamp?: PlacementTimestamp) {
  const gain = end - start;
  const ratingCap = getRatingCap(timestamp);

  // Possible placements
  const placements = [1, 2, 3, 3.5, 4, 4.5, 5, 5.5, 6, 6.5, 7, 7.5, 8];

  // Keep aligned with the bot's src/utils/placement_utils.py and database estimator.
  const dexAvg = start < 8200 ? start : (start - 0.85 * (start - 8500));

  // Find placement with smallest delta
  const best = placements.reduce(
    (bestSoFar, p) => {
      // avgOpp-formula
      const avgOpp =
        start - 148.1181435 * (100 - ((p - 1) * (200 / 7) + gain));
      
      if (avgOpp > ratingCap) {
        return bestSoFar;
      }

      const delta = Math.abs(dexAvg - avgOpp);

      if (delta < bestSoFar.delta) {
        return { placement: p, delta };
      }
      return bestSoFar;
    },
    { placement: placements[0], delta: Infinity }
  );

  // { placement: number, delta: number }
  return best;
}

/**
 * Calculate placements for an array of ratings
 * @param ratings - Array of rating values in chronological order
 * @param timestamps - Optional snapshot times, one per rating. Defaults to the current time.
 * @returns Array of placements (X ratings returns X-1 placements)
 */
export function calculatePlacements(
  ratings: number[],
  timestamps?: PlacementTimestamp[],
): number[] {
  if (ratings.length < 2) {
    return [];
  }

  const placements: number[] = [];
  // Only use timestamps when there is exactly one per rating (same as the bot).
  const useTimestamps = timestamps !== undefined && timestamps.length === ratings.length;

  for (let i = 0; i < ratings.length - 1; i++) {
    const start = ratings[i];
    const end = ratings[i + 1];
    // The snapshot that ends the rating change decides the rating cap.
    const endTime = useTimestamps ? timestamps?.[i + 1] : undefined;
    const result = estimatePlacement(start, end, endTime);
    placements.push(result.placement);
  }

  return placements;
}

/**
 * Calculate the average placement from an array of ratings
 * @param ratings - Array of rating values in chronological order
 * @param timestamps - Optional snapshot times, one per rating. Defaults to the current time.
 * @returns Average placement (returns NaN if fewer than 2 ratings)
 */
export function calculateAveragePlacement(
  ratings: number[],
  timestamps?: PlacementTimestamp[],
): number {
  const placements = calculatePlacements(ratings, timestamps);
  
  if (placements.length === 0) {
    return NaN;
  }
  
  const sum = placements.reduce((acc, p) => acc + p, 0);
  return sum / placements.length;
}

/**
 * Calculate both placements array and average placement
 * Useful when you need both values without calculating twice
 * @param ratings - Array of rating values in chronological order
 * @param precision - Decimal places for the rounded average (default: 2)
 * @param timestamps - Optional snapshot times, one per rating. Defaults to the current time.
 * @returns Object with placements array and average placement
 */
export function calculatePlacementsWithAverage(
  ratings: number[],
  precision = 2,
  timestamps?: PlacementTimestamp[],
): {
  placements: number[];
  average: number;
} {
  const placements = calculatePlacements(ratings, timestamps);
  const average = placements.length === 0 
    ? NaN 
    : placements.reduce((acc, p) => acc + p, 0) / placements.length;
  
  return { 
    placements, 
    average: typeof average === "number" && !isNaN(average) ? Number(average.toFixed(precision)) : average 
  };
}

