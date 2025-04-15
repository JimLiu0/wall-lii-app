// Remove consecutive duplicate ratings
export const dedupData = (data: any[]) => {
  return data.filter((entry, index, arr) => {
    if (index === 0) return true;
    return entry.rating !== arr[index - 1].rating;
  });
};
