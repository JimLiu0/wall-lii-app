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
import { Info } from 'lucide-react';

type TimeView = 'all' | 'week' | 'day';
type GameMode = 's' | 'd';

interface PlayerData {
  name: string;
  rank: number;
  rating: number;
  peak: number;
  region: string;
  data: { snapshot_time: string; rating: number }[];
  availableModes: {
    regions: string[];
    gameModes: string[];
    defaultRegion: string;
    defaultGameMode: string;
    availableCombos: string[];
  };
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
  offset: number;
  playerData: PlayerData;
  channelData: ChannelEntry[];
  chineseStreamerData: ChineseChannelEntry[];
}

export default function PlayerProfile({ player, region, view: viewParam, offset, playerData, channelData, chineseStreamerData }: Props) {
  const searchParams = useSearchParams();
  const [showTimeModal, setShowTimeModal] = useState(false);
  const [isLoadingOffset, setIsLoadingOffset] = useState(false);

  const [gameMode, setGameMode] = useState<GameMode>((searchParams.get('g') as GameMode) || 's');
  const [currentRegion, setCurrentRegion] = useState<string>(region);
  const [currentView, setCurrentView] = useState<TimeView>(viewParam === 'w' ? 'week' : viewParam === 'd' ? 'day' : 'all');
  const [offsetNumState, setOffsetNumState] = useState<number>(offset || 0);

  const [offsetInput, setOffsetInput] = useState(offsetNumState);
  useEffect(() => {
    setOffsetInput(offsetNumState);
  }, [offsetNumState]);
  // const gameMode = searchParams.get('g') as GameMode || 's';

  // Memoize the Info icon click handler to prevent unnecessary re-renders
  const handleInfoClick = useCallback(() => {
    setShowTimeModal(prev => !prev);
  }, []);

  // Generate back button URL based on current region and game mode
  const getBackUrl = () => {
    const gameModeParam = gameMode === 'd' ? 'duo' : 'solo';
    if (currentRegion === 'all') {
      return `/lb/all?mode=${gameModeParam}`;
    }
    return `/lb/${currentRegion}?mode=${gameModeParam}`;
  };

  let filteredData = useMemo(() => {
    let filtered = playerData.data;

    if (currentView !== 'all') {
      const now = DateTime.now().setZone('America/Los_Angeles');
      let startTime: DateTime;
      let endTime: DateTime;

      if (currentView === 'week') {
        startTime = now.minus({ weeks: offsetNumState }).startOf('week').startOf('day');
        endTime = startTime.plus({ weeks: 1 });
      } else {
        startTime = now.minus({ days: offsetNumState }).startOf('day');
        endTime = startTime.plus({ days: 1 });
      }

      // Get data in current window
      filtered = playerData.data.filter((item) => {
        const itemTime = DateTime.fromISO(item.snapshot_time).setZone('America/Los_Angeles');
        return itemTime >= startTime && itemTime <= endTime;
      });

      // Get all data before current window
      const previousWindowData = playerData.data
        .filter(item => DateTime.fromISO(item.snapshot_time).setZone('America/Los_Angeles') < startTime)
        .sort((a, b) => DateTime.fromISO(b.snapshot_time).setZone('America/Los_Angeles').toMillis() - DateTime.fromISO(a.snapshot_time).setZone('America/Los_Angeles').toMillis());

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
  }, [playerData.data, currentView, offsetNumState]);

  filteredData = dedupData(filteredData);

  const replaceUrlWithoutNavigation = (params: URLSearchParams) => {
    const url = `/stats/${player}?${params.toString()}`;
    window.history.replaceState(null, '', url);
  };

  const updateView = (newView: TimeView) => {
    setCurrentView(newView);
    setOffsetNumState(0);
    const periodMap = { all: 's', week: 'w', day: 'd' };
    const params = new URLSearchParams(searchParams);
    params.set('v', periodMap[newView]);
    params.set('o', '0');
    replaceUrlWithoutNavigation(params);
  };

  const updateOffset = (newOffset: number) => {
    setIsLoadingOffset(true);
    setOffsetNumState(newOffset);
    setOffsetInput(newOffset);
    const params = new URLSearchParams(searchParams);
    params.set('o', newOffset.toString());
    replaceUrlWithoutNavigation(params);
    setIsLoadingOffset(false);
  };

  const updateGameMode = (newGameMode: GameMode) => {
    setGameMode(newGameMode);
    const params = new URLSearchParams(searchParams);
    params.set('g', newGameMode);
    replaceUrlWithoutNavigation(params);
  };

  const updateRegion = (newRegion: string) => {
    setCurrentRegion(newRegion.toLowerCase());
    const params = new URLSearchParams(searchParams);
    params.set('r', newRegion.toLowerCase());
    replaceUrlWithoutNavigation(params);
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
      const g = (sp.get('g') as GameMode) || 's';
      const r = (sp.get('r') || currentRegion).toLowerCase();
      const vParam = sp.get('v');
      const v: TimeView = vParam === 'w' ? 'week' : vParam === 'd' ? 'day' : 'all';
      const o = Number(sp.get('o') || 0);
      setGameMode(g);
      setCurrentRegion(r);
      setCurrentView(v);
      setOffsetNumState(Number.isFinite(o) ? o : 0);
      setOffsetInput(Number.isFinite(o) ? o : 0);
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, [currentRegion]);

  return (
    <div className="container mx-auto p-4">
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
              <div className="text-2xl text-white">{playerData.rank || 'N/A'}</div>
            </div>
            <div>
              <div className="text-gray-400 text-sm">Rating</div>
              <div className="text-2xl text-white">{playerData.rating}</div>
            </div>
            <div>
              <div className="text-gray-400 text-sm">Peak</div>
              <div className="text-2xl text-white">{playerData.peak}</div>
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
                <div className="flex gap-2 mt-4">
                  <button
                    onClick={() => updateOffset(offsetNumState + 1)}
                    className="px-3 py-2 rounded transition-colors bg-gray-800 text-gray-300 hover:bg-gray-700"
                  >
                    ⬅️
                  </button>
                  <div className="flex items-center gap-2 px-3 py-2 rounded bg-gray-800">
                    <input
                      type="number"
                      value={offsetInput}
                      onChange={(e) => setOffsetInput(Number(e.target.value))}
                      min={0}
                      max={99}
                      placeholder="Offset"
                      className="w-14 h-8 text-center text-sm rounded bg-gray-900 text-white border border-gray-700 focus:outline-none"
                    />
                    <span className="text-sm text-gray-300">
                      {currentView === 'week' && `week${offsetInput !== 1 ? 's' : ''} ago`}
                      {currentView === 'day' && `day${offsetInput !== 1 ? 's' : ''} ago`}
                    </span>
                    <button
                      onClick={() => updateOffset(offsetInput)}
                      className={`h-8 px-3 text-sm rounded transition-colors ${isLoadingOffset ? 'bg-blue-900 text-blue-300' : 'bg-blue-600 text-white hover:bg-blue-500'}`}
                      disabled={isLoadingOffset}
                    >
                      {isLoadingOffset ? 'Loading…' : 'Go'}
                    </button>
                  </div>
                  <button
                    className={`px-3 py-2 rounded transition-colors bg-gray-800 text-gray-300 hover:bg-gray-700 ${offsetNumState === 0 && 'hidden'}`}
                    onClick={() => updateOffset(offsetNumState - 1)}
                  >
                    ➡️
                  </button>
                </div>
              )}

              {showTimeModal && (
                <div className="text-xs text-gray-400 mt-2">All stats and resets use Pacific Time (PT) midnight as the daily/weekly reset.</div>
              )}

              <div className="text-xl font-bold text-white mt-4">
                {currentView === 'all'
                  ? 'Season Rating Record'
                  : `${currentView === 'week' ? 'Week' : 'Day'} - ${getPeriodLabel(currentView, offsetNumState)}`}
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