'use client';
import SocialIndicators from './SocialIndicators';
import { useSearchParams } from 'next/navigation';
import { useMemo, useState, useCallback, useEffect } from 'react';
import { DateTime } from 'luxon';
import PlayerGraph from '@/components/PlayerGraph';
import StatsSummary from '@/components/StatsSummary';
import getPeriodLabel from '@/utils/getPeriodLabel';
import { dedupData } from '@/utils/getDedupData';
import ButtonGroup from './ButtonGroup';
import PlayerHeader from './PlayerHeader';
import DatePicker from './DatePicker';
import { Info } from 'lucide-react';
import { normalizeUrlParams, toNewUrlParams } from '@/utils/urlParams';

type TimeView = 'all' | 'week' | 'day';
type GameMode = 's' | 'd';

interface PlayerData {
  name: string;
  data: { game_mode: string, player_name: string, region: string, snapshot_time: string; rating: number }[];
  availableModes: {
    regions: string[];
    gameModes: string[];
    defaultRegion: string;
    defaultGameMode: string;
    availableCombos: string[];
  };
  currentRanks: Record<string, number | null>; // Key: "region-gameMode", Value: rank
}

interface ChannelEntry {
  channel: string;
  player: string;
  live: boolean;
  youtube?: string;
}

interface ChineseChannelEntry {
  player: string;
  url: string;
}

interface Props {
  player: string;
  region: string;
  view: string;
  date: string | null; // ISO date string from server component (new format)
  playerData: PlayerData;
  channelData: ChannelEntry[];
  chineseStreamerData: ChineseChannelEntry[];
}

export default function PlayerProfile({ player, region, date, playerData, channelData, chineseStreamerData }: Props) {
  const searchParams = useSearchParams();
  const [showTimeModal, setShowTimeModal] = useState(false);

  // Normalize URL params (handles both old and new format for backwards compatibility)
  const normalizedParams = useMemo(() => {
    const params: Record<string, string> = {};
    searchParams.forEach((value, key) => {
      params[key] = value;
    });
    return normalizeUrlParams(params);
  }, [searchParams]);

  const [gameMode, setGameMode] = useState<GameMode>(normalizedParams.mode === 'duo' ? 'd' : 's');
  const [currentRegion, setCurrentRegion] = useState<string>(region);
  const [currentView, setCurrentView] = useState<TimeView>(normalizedParams.view);
  
  // Initialize selectedDate from date parameter or calculate from offset
  const [selectedDate, setSelectedDate] = useState<DateTime>(() => {
    const ptNow = DateTime.now().setZone('America/Los_Angeles');
    if (date) {
      // Parse date as if it's in PST timezone to avoid timezone shifts
      const parsedDate = DateTime.fromISO(date, { zone: 'America/Los_Angeles' }).startOf('day');
      if (parsedDate.isValid) {
        return parsedDate;
      }
    }
    // Fall back to calculating from offset using normalizedParams
    const view = normalizedParams.view;
    const offset = normalizedParams.offset;
    if (view === 'day') {
      return ptNow.minus({ days: offset }).startOf('day');
    } else if (view === 'week') {
      return ptNow.minus({ weeks: offset }).startOf('week').startOf('day');
    }
    return ptNow.startOf('day');
  });

  // Sync selectedDate when date prop changes (from server)
  useEffect(() => {
    if (date) {
      // Parse date as if it's in PST timezone to avoid timezone shifts
      const parsedDate = DateTime.fromISO(date, { zone: 'America/Los_Angeles' }).startOf('day');
      if (parsedDate.isValid) {
        setSelectedDate(parsedDate);
      }
    }
  }, [date]);

  // Calculate current rank from pre-fetched data
  const currentRank = useMemo(() => {
    if (currentRegion === 'all') {
      return null;
    }
    
    const gameModeEnum = gameMode === 'd' ? '1' : '0';
    const comboKey = `${currentRegion}-${gameModeEnum}`;
    return playerData.currentRanks[comboKey] || null;
  }, [currentRegion, gameMode, playerData.currentRanks]);

  // Memoize the Info icon click handler to prevent unnecessary re-renders
  const handleInfoClick = useCallback(() => {
    setShowTimeModal(prev => !prev);
  }, []);

  // Generate back button URL based on current region and game mode
  const getBackUrl = () => {
    const gameModeParam = gameMode === 'd' ? 'duo' : 'solo';
    return `/lb/${currentRegion}/${gameModeParam}`;
  };

  const peakRating = playerData.data.filter((row) => row.region.toLowerCase() === currentRegion).reduce((max, item) => Math.max(max, item.rating), 0);

  // Calculate offset from selectedDate for internal use
  const calculatedOffset = useMemo(() => {
    if (currentView === 'all') return 0;
    const now = DateTime.now().setZone('America/Los_Angeles');
    if (currentView === 'day') {
      return Math.max(0, Math.floor(now.startOf('day').diff(selectedDate.startOf('day'), 'days').days));
    } else if (currentView === 'week') {
      return Math.max(0, Math.floor(now.startOf('week').startOf('day').diff(selectedDate.startOf('week').startOf('day'), 'weeks').weeks));
    }
    return 0;
  }, [currentView, selectedDate]);

  // Calculate minDate from the oldest snapshot for the current region and game mode
  const calculatedMinDate = useMemo(() => {
    const gameModeEnum = gameMode === 'd' ? '1' : '0';
    const regionModeData = playerData.data.filter((row) => 
      row.game_mode === gameModeEnum && row.region.toLowerCase() === currentRegion
    );
    
    if (regionModeData.length > 0) {
      const oldestSnapshot = regionModeData.reduce((oldest, current) => 
        current.snapshot_time < oldest.snapshot_time ? current : oldest
      );
      return DateTime.fromISO(oldestSnapshot.snapshot_time, { zone: 'America/Los_Angeles' }).startOf('day');
    }
    
    // Fallback to 30 days ago if no data for this region/mode
    return DateTime.now().setZone('America/Los_Angeles').minus({ days: 30 }).startOf('day');
  }, [playerData.data, currentRegion, gameMode]);

  let filteredData = useMemo(() => {
    // First filter by region and game mode
    const gameModeEnum = gameMode === 'd' ? '1' : '0';
    let filtered = playerData.data.filter((row) => 
      row.game_mode === gameModeEnum && row.region.toLowerCase() === currentRegion
    );

    if (currentView !== 'all') {
      let startTime: DateTime;
      let endTime: DateTime;

      if (currentView === 'week') {
        startTime = selectedDate.startOf('week').startOf('day');
        endTime = startTime.plus({ weeks: 1 });
      } else {
        startTime = selectedDate.startOf('day');
        endTime = startTime.plus({ days: 1 });
      }

      // Get all data before current window
      const previousWindowData = filtered
        .filter(item => DateTime.fromISO(item.snapshot_time).setZone('America/Los_Angeles') < startTime)
        .sort((a, b) => DateTime.fromISO(b.snapshot_time).setZone('America/Los_Angeles').toMillis() - DateTime.fromISO(a.snapshot_time).setZone('America/Los_Angeles').toMillis());

      // Get data in current window
      filtered = filtered.filter((item) => {
        const itemTime = DateTime.fromISO(item.snapshot_time).setZone('America/Los_Angeles');
        return itemTime >= startTime && itemTime <= endTime;
      });

      // If we have data in current window
      if (filtered.length > 0) {

        // Get all entries before the window
        const beforeWindow = previousWindowData.filter(item =>
          DateTime.fromISO(item.snapshot_time).setZone('America/Los_Angeles') < startTime
        ).sort((a, b) =>
          DateTime.fromISO(b.snapshot_time).setZone('America/Los_Angeles').toMillis() - DateTime.fromISO(a.snapshot_time).setZone('America/Los_Angeles').toMillis()
        );

        // If we have entries before the window, add the most recent one
        if (beforeWindow.length > 0) {
          // Find the last consecutive duplicate rating from before the window
          let lastDuplicateIndex = 0;
          const firstRating = beforeWindow[0].rating;

          for (let i = 1; i < beforeWindow.length; i++) {
            if (beforeWindow[i].rating === firstRating) {
              lastDuplicateIndex = i;
            } else {
              break;
            }
          }

          filtered.unshift(beforeWindow[lastDuplicateIndex]);
        }

        // Remove any duplicates
        filtered = dedupData(filtered);
      } else if (previousWindowData.length > 0) {
        // No data in current window but we have previous data
        // Use the most recent previous rating
        filtered = [previousWindowData[0]];
      }
    }

    return filtered;
  }, [playerData.data, currentView, selectedDate, currentRegion, gameMode]);

  filteredData = dedupData(filteredData);

  // Calculate derived stats from filtered data
  const currentRating = filteredData.length > 0 ? filteredData[filteredData.length - 1]?.rating : 0;

  const replaceUrlWithoutNavigation = useCallback((newParams: {
    region: string;
    mode: 'solo' | 'duo';
    view: 'all' | 'week' | 'day';
    date: string | null;
  }) => {
    const params = toNewUrlParams(newParams);
    const url = `/stats/${player}?${params.toString()}`;
    window.history.replaceState(null, '', url);
  }, [player]);

  const updateView = (newView: TimeView) => {
    setCurrentView(newView);
    
    // Calculate date for new view (today for day/week, null for all)
    const ptNow = DateTime.now().setZone('America/Los_Angeles');
    let newDate: string | null = null;
    if (newView === 'day') {
      newDate = ptNow.startOf('day').toISODate();
      setSelectedDate(ptNow.startOf('day'));
    } else if (newView === 'week') {
      newDate = ptNow.startOf('week').startOf('day').toISODate();
      setSelectedDate(ptNow.startOf('week').startOf('day'));
    }
    
    replaceUrlWithoutNavigation({
      region: currentRegion,
      mode: gameMode === 'd' ? 'duo' : 'solo',
      view: newView,
      date: newDate
    });
  };

  const handleDateChange = (date: DateTime) => {
    // For week view, normalize to start of week
    const normalizedDate = currentView === 'week' 
      ? date.startOf('week').startOf('day')
      : date.startOf('day');
    setSelectedDate(normalizedDate);
    
    // Update URL with new date
    if (currentView === 'all') return;
    
    const dateIso = normalizedDate.toISODate();
    if (dateIso) {
      replaceUrlWithoutNavigation({
        region: currentRegion,
        mode: gameMode === 'd' ? 'duo' : 'solo',
        view: currentView,
        date: dateIso
      });
      
    }
  };

  const updateGameMode = (newGameMode: GameMode) => {
    setGameMode(newGameMode);
    let dateIso: string | null = null;
    if (currentView !== 'all') {
      const normalizedDate = currentView === 'week'
        ? selectedDate.startOf('week').startOf('day')
        : selectedDate.startOf('day');
      dateIso = normalizedDate.toISODate();
    }
    replaceUrlWithoutNavigation({
      region: currentRegion,
      mode: newGameMode === 'd' ? 'duo' : 'solo',
      view: currentView,
      date: dateIso
    });
  };

  const updateRegion = (newRegion: string) => {
    setCurrentRegion(newRegion.toLowerCase());
    let dateIso: string | null = null;
    if (currentView !== 'all') {
      const normalizedDate = currentView === 'week'
        ? selectedDate.startOf('week').startOf('day')
        : selectedDate.startOf('day');
      dateIso = normalizedDate.toISODate();
    }
    replaceUrlWithoutNavigation({
      region: newRegion.toLowerCase(),
      mode: gameMode === 'd' ? 'duo' : 'solo',
      view: currentView,
      date: dateIso
    });
  };

  const { availableModes } = playerData;
  const { availableCombos } = availableModes;

  // Helper function to check if a combination exists
  const hasCombo = (r: string, gm: string) =>
    availableCombos.includes(`${r.toLowerCase()}-${gm === 'd' ? '1' : '0'}`);

  // Determine which buttons to show
  const showSoloButton = hasCombo(currentRegion, 's');
  const showDuoButton = hasCombo(currentRegion, 'd');
  const showRegionButtons = availableModes.regions.filter(r =>
    hasCombo(r, gameMode)  // Only show regions that have data for the current game mode
  );

  useEffect(() => {
    const onPopState = () => {
      const sp = new URLSearchParams(window.location.search);
      const params: Record<string, string> = {};
      sp.forEach((value, key) => {
        params[key] = value;
      });
      const normalized = normalizeUrlParams(params);
      
      setGameMode(normalized.mode === 'duo' ? 'd' : 's');
      setCurrentRegion(normalized.region.toLowerCase());
      setCurrentView(normalized.view);
      
      // Update selectedDate from normalized date
      if (normalized.date) {
        // Parse date as if it's in PST timezone to avoid timezone shifts
        const parsedDate = DateTime.fromISO(normalized.date, { zone: 'America/Los_Angeles' }).startOf('day');
        if (parsedDate.isValid) {
          setSelectedDate(parsedDate);
        }
      } else if (normalized.view !== 'all') {
        const ptNow = DateTime.now().setZone('America/Los_Angeles');
        if (normalized.view === 'day') {
          setSelectedDate(ptNow.startOf('day'));
        } else if (normalized.view === 'week') {
          setSelectedDate(ptNow.startOf('week').startOf('day'));
        }
      }
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, [currentRegion]);

  return (
    <div className="container mx-auto py-4 px-0 [@media(min-width:431px)]:px-4">
      <div className="bg-gray-900 rounded-lg p-6">
        <div className="flex flex-col gap-4 mb-8">
          <PlayerHeader backUrl={getBackUrl()} />

          {/* Player name with social indicators */}
          <div className="flex items-center gap-2">
            <h1 className="text-4xl sm:text-4xl font-bold text-white break-all">
              {playerData.name}
            </h1>
            <SocialIndicators playerName={playerData.name} channelData={channelData} chineseStreamerData={chineseStreamerData} />
          </div>
          <div className="flex gap-8">
            <div>
              <div className="text-gray-400 text-sm">Rank</div>
              <div className="text-2xl text-white">{currentRank || 'N/A'}</div>
            </div>
            <div>
              <div className="text-gray-400 text-sm">Rating</div>
              <div className="text-2xl text-white">{currentRating}</div>
            </div>
            <div>
              <div className="text-gray-400 text-sm">Peak</div>
              <div className="text-2xl text-white">{peakRating}</div>
            </div>
          </div>
        </div>

        <div className="flex flex-col md:flex-row gap-6">
          <div className="w-full md:w-3/4">
            <div className="mb-6">
              <div className="flex flex-wrap gap-4 items-center mb-4">
                <ButtonGroup
                  options={[
                    ...(showSoloButton ? [{ label: 'Solo', value: 's' as const }] : []),
                    ...(showDuoButton ? [{ label: 'Duo', value: 'd' as const }] : []),
                  ]}
                  selected={gameMode}
                  onChange={updateGameMode}
                />
                <ButtonGroup
                  options={showRegionButtons.map(r => ({ label: r.toUpperCase(), value: r }))}
                  selected={currentRegion}
                  onChange={updateRegion}
                />
              </div>

              <div className="flex gap-2 mt-4 items-center">
                <ButtonGroup
                  options={['all', 'week', 'day'].map(v => ({
                    label: v === 'all' ? 'Season' : v.charAt(0).toUpperCase() + v.slice(1),
                    value: v as TimeView
                  }))}
                  selected={currentView}
                  onChange={updateView}
                />
                <Info onClick={handleInfoClick} className='text-blue-400 hover:text-blue-300 cursor-pointer' />
              </div>

              {currentView !== 'all' && (
                <div className="flex items-center gap-1 mt-4">


                  {/* Date picker */}
                  <DatePicker
                    selectedDate={selectedDate}
                    onDateChange={handleDateChange}
                    maxDate={DateTime.now().setZone('America/Los_Angeles').endOf('day')}
                    minDate={calculatedMinDate}
                    weekNavigation={currentView === 'week'}
                  />
                </div>
              )}

              {showTimeModal && (
                <div className="text-xs text-gray-400 mt-2">All stats and resets use Pacific Time (PT) midnight as the daily/weekly reset.</div>
              )}

              <div className="text-xl font-bold text-white mt-4">
                {currentView === 'all'
                  ? 'Season Rating Record'
                  : `${currentView === 'week' ? 'Week' : 'Day'} - ${getPeriodLabel(currentView, calculatedOffset)}`}
              </div>
            </div>

            <div className="h-[300px] w-full">
              {filteredData.length > 0 ? (
                <PlayerGraph data={filteredData} playerName={playerData.name} />
              ) : (
                <div className="flex items-center justify-center h-full text-gray-400">
                  No data found during this period
                </div>
              )}
            </div>
          </div>

          {filteredData.length > 0 && (
            <div className="w-full md:w-1/4 flex justify-center items-center">
              <StatsSummary data={filteredData} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}