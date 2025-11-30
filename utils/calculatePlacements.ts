// Estimate most likely placement given start and end MMR
export function estimatePlacement(start: number, end: number) {
  const gain = end - start;

  // Possible placements
  const placements = [1, 2, 3, 3.5, 4, 4.5, 5, 5.5, 6, 6.5, 7, 7.5, 8];

  // dexAvg (same formula, using starting MMR)
  const dexAvg = start < 8200 ? start : (start - 0.85 * (start - 8500));

  // Find placement with smallest delta
  const best = placements.reduce(
    (bestSoFar, p) => {
      // avgOpp-formula
      const avgOpp =
        start - 148.1181435 * (100 - ((p - 1) * (200 / 7) + gain));

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
 * @returns Array of placements (X ratings returns X-1 placements)
 */
export function calculatePlacements(ratings: number[]): number[] {
  if (ratings.length < 2) {
    return [];
  }

  const placements: number[] = [];
  
  for (let i = 0; i < ratings.length - 1; i++) {
    const start = ratings[i];
    const end = ratings[i + 1];
    const result = estimatePlacement(start, end);
    placements.push(result.placement);
  }

  return placements;
}

/**
 * Calculate the average placement from an array of ratings
 * @param ratings - Array of rating values in chronological order
 * @returns Average placement (returns NaN if fewer than 2 ratings)
 */
export function calculateAveragePlacement(ratings: number[]): number {
  const placements = calculatePlacements(ratings);
  
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
 * @returns Object with placements array and average placement
 */
export function calculatePlacementsWithAverage(ratings: number[], precision=2): {
  placements: number[];
  average: number;
} {
  const placements = calculatePlacements(ratings);
  const average = placements.length === 0 
    ? NaN 
    : placements.reduce((acc, p) => acc + p, 0) / placements.length;
  
  return { 
    placements, 
    average: typeof average === "number" && !isNaN(average) ? Number(average.toFixed(precision)) : average 
  };
}

