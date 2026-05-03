import { DateTime } from 'luxon';

import { calculatePlacementsWithAverage } from '@/utils/calculatePlacements';
import { dedupData } from '@/utils/getDedupData';
import type { PlayerData, SnapshotPoint } from './data';

export type TimeView = 'all' | 'week' | 'day';
export type GameMode = 's' | 'd';

export function getCurrentRank(
  currentRegion: string,
  gameMode: GameMode,
  currentRanks: Record<string, number | null>,
) {
  if (currentRegion === 'all') {
    return null;
  }

  const gameModeEnum = gameMode === 'd' ? '1' : '0';
  const comboKey = `${currentRegion}-${gameModeEnum}`;
  return currentRanks[comboKey] || null;
}

export function getProfileDateOffset(currentView: TimeView, selectedDate: DateTime) {
  if (currentView === 'all') return 0;

  const now = DateTime.now().setZone('America/Los_Angeles');
  if (currentView === 'day') {
    return Math.max(0, Math.floor(now.startOf('day').diff(selectedDate.startOf('day'), 'days').days));
  }

  return Math.max(0, Math.floor(now.startOf('week').startOf('day').diff(selectedDate.startOf('week').startOf('day'), 'weeks').weeks));
}

export function getProfileMinDate(data: SnapshotPoint[], currentRegion: string, gameMode: GameMode) {
  const gameModeEnum = gameMode === 'd' ? '1' : '0';
  const regionModeData = data.filter((row) =>
    row.game_mode === gameModeEnum && row.region.toLowerCase() === currentRegion
  );

  if (regionModeData.length > 0) {
    const oldestSnapshot = regionModeData.reduce((oldest, current) =>
      current.snapshot_time < oldest.snapshot_time ? current : oldest
    );
    return DateTime.fromISO(oldestSnapshot.snapshot_time, { zone: 'America/Los_Angeles' }).startOf('day');
  }

  return DateTime.now().setZone('America/Los_Angeles').minus({ days: 30 }).startOf('day');
}

export function getFilteredProfileData(
  data: SnapshotPoint[],
  currentView: TimeView,
  selectedDate: DateTime,
  currentRegion: string,
  gameMode: GameMode,
) {
  const gameModeEnum = gameMode === 'd' ? '1' : '0';
  let filtered = data.filter((row) =>
    row.game_mode === gameModeEnum && row.region.toLowerCase() === currentRegion
  );

  if (currentView !== 'all') {
    const startTime = currentView === 'week'
      ? selectedDate.startOf('week').startOf('day')
      : selectedDate.startOf('day');
    const endTime = currentView === 'week'
      ? startTime.plus({ weeks: 1 })
      : startTime.plus({ days: 1 });

    const previousWindowData = filtered
      .filter((item) => DateTime.fromISO(item.snapshot_time).setZone('America/Los_Angeles') < startTime)
      .sort((a, b) => DateTime.fromISO(b.snapshot_time).setZone('America/Los_Angeles').toMillis() - DateTime.fromISO(a.snapshot_time).setZone('America/Los_Angeles').toMillis());

    filtered = filtered.filter((item) => {
      const itemTime = DateTime.fromISO(item.snapshot_time).setZone('America/Los_Angeles');
      return itemTime >= startTime && itemTime <= endTime;
    });

    if (filtered.length > 0) {
      const beforeWindow = previousWindowData.filter((item) =>
        DateTime.fromISO(item.snapshot_time).setZone('America/Los_Angeles') < startTime
      ).sort((a, b) =>
        DateTime.fromISO(b.snapshot_time).setZone('America/Los_Angeles').toMillis() - DateTime.fromISO(a.snapshot_time).setZone('America/Los_Angeles').toMillis()
      );

      if (beforeWindow.length > 0) {
        let lastDuplicateIndex = 0;
        const firstRating = beforeWindow[0].rating;

        for (let index = 1; index < beforeWindow.length; index += 1) {
          if (beforeWindow[index].rating === firstRating) {
            lastDuplicateIndex = index;
          } else {
            break;
          }
        }

        filtered.unshift(beforeWindow[lastDuplicateIndex]);
      }

      filtered = dedupData(filtered);
    } else if (previousWindowData.length > 0) {
      filtered = [previousWindowData[0]];
    }
  }

  return dedupData(filtered);
}

export function getGameRecordsFilterKey(
  player: string,
  currentRegion: string,
  gameMode: GameMode,
  currentView: TimeView,
  selectedDate: DateTime,
) {
  const dateKey = currentView === 'all' ? 'season' : selectedDate.toISODate() ?? '';
  return `${player}-${currentRegion}-${gameMode}-${currentView}-${dateKey}`;
}

export function getProfileCurrentRating(data: SnapshotPoint[], currentRegion: string, gameMode: GameMode) {
  const gameModeEnum = gameMode === 'd' ? '1' : '0';
  const regionModeSnapshots = data.filter(
    (row) =>
      row.game_mode === gameModeEnum &&
      row.region.toLowerCase() === currentRegion
  );
  return regionModeSnapshots[regionModeSnapshots.length - 1]?.rating ?? 0;
}

export function getAvailableProfileControls(playerData: PlayerData, currentRegion: string, gameMode: GameMode) {
  const { availableCombos } = playerData.availableModes;
  const hasCombo = (region: string, mode: GameMode) =>
    availableCombos.includes(`${region.toLowerCase()}-${mode === 'd' ? '1' : '0'}`);

  return {
    showSoloButton: hasCombo(currentRegion, 's'),
    showDuoButton: hasCombo(currentRegion, 'd'),
    showRegionButtons: playerData.availableModes.regions.filter((region) =>
      hasCombo(region, gameMode)
    ),
  };
}

export function getProfilePlacementStats(filteredData: SnapshotPoint[]) {
  const ratings = filteredData.map((snapshot) => snapshot.rating);
  return calculatePlacementsWithAverage(ratings);
}
