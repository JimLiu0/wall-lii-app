'use client';
import { useSearchParams } from 'next/navigation';
import { useMemo, useState, useCallback, useEffect } from 'react';
import { DateTime } from 'luxon';
import PlayerGraph from './PlayerGraph';
import getPeriodLabel from '@/utils/getPeriodLabel';
import { normalizeUrlParams, toNewUrlParams } from '@/utils/urlParams';
import GameRecordsSection from './GameRecordsSection';
import ProfileHeader from './ProfileHeader';
import ProfileInfo from './ProfileInfo';
import ProfileControls from './ProfileControls';
import SessionStats from './SessionStats';
import AdPageShell from '@/components/ads/AdPageShell';
import InlineAd from '@/components/ads/InlineAd';
import { adSlots } from '@/components/ads/adSlots';
import DashboardCard from '@/components/shared/DashboardCard';
import type { PlayerData } from '../_lib/data';
import {
  getAvailableProfileControls,
  getCurrentRank,
  getFilteredProfileData,
  getGameRecordsFilterKey,
  getProfileCurrentRating,
  getProfileDateOffset,
  getProfileMinDate,
  getProfilePlacementStats,
  type GameMode,
  type TimeView,
} from '../_lib/profileDerivations';

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

  const currentRank = useMemo(() => {
    return getCurrentRank(currentRegion, gameMode, playerData.currentRanks);
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

  const calculatedOffset = useMemo(() => {
    return getProfileDateOffset(currentView, selectedDate);
  }, [currentView, selectedDate]);

  const calculatedMinDate = useMemo(() => {
    return getProfileMinDate(playerData.data, currentRegion, gameMode);
  }, [playerData.data, currentRegion, gameMode]);

  const filteredData = useMemo(() => {
    return getFilteredProfileData(playerData.data, currentView, selectedDate, currentRegion, gameMode);
  }, [playerData.data, currentView, selectedDate, currentRegion, gameMode]);

  const gameRecordsFilterKey = useMemo(() => {
    return getGameRecordsFilterKey(player, currentRegion, gameMode, currentView, selectedDate);
  }, [player, currentRegion, gameMode, currentView, selectedDate]);

  const { placements, average: averagePlacement } = getProfilePlacementStats(filteredData);

  const currentRating = useMemo(() => {
    return getProfileCurrentRating(playerData.data, currentRegion, gameMode);
  }, [playerData.data, currentRegion, gameMode]);

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

  const { showSoloButton, showDuoButton, showRegionButtons } = useMemo(() => {
    return getAvailableProfileControls(playerData, currentRegion, gameMode);
  }, [playerData, currentRegion, gameMode]);

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
    <AdPageShell topSlot={adSlots.top} contentMaxWidth="80rem">
      <DashboardCard>
        <div className="flex flex-col gap-4">
          <ProfileHeader backUrl={getBackUrl()} />
          <ProfileInfo
            playerName={playerData.name}
            channelData={channelData}
            chineseStreamerData={chineseStreamerData}
            currentRank={currentRank}
            currentRating={currentRating}
            region={currentRegion}
            mode={gameMode === 'd' ? 'duo' : 'solo'}
            view={currentView}
            selectedDate={currentView === 'all' ? null : selectedDate.toISODate()}
          />
          <ProfileControls
            gameMode={gameMode}
            currentRegion={currentRegion}
            currentView={currentView}
            showSoloButton={showSoloButton}
            showDuoButton={showDuoButton}
            showRegionButtons={showRegionButtons}
            selectedDate={selectedDate}
            calculatedMinDate={calculatedMinDate}
            showTimeModal={showTimeModal}
            onGameModeChange={updateGameMode}
            onRegionChange={updateRegion}
            onViewChange={updateView}
            onDateChange={handleDateChange}
            onInfoClick={handleInfoClick}
          />
          {filteredData.length > 0 && (
            <SessionStats
              data={filteredData}
              region={currentRegion}
              averagePlacement={averagePlacement}
            />
          )}
        </div>

        {filteredData.length > 1 && (
          <InlineAd slot={adSlots.inline} tabletAndBelow />
        )}

        <div className="flex flex-col stack-compact">
          <div className="w-full">
            <div className="mb-6">
              <div className="text-xl font-bold mt-4 text-center">
                {currentView === 'all'
                  ? 'Season Rating Record'
                  : `${currentView === 'week' ? 'Week' : 'Day'} - ${getPeriodLabel(currentView, calculatedOffset)}`}
              </div>
            </div>

            <div className="h-[300px] w-full">
              {filteredData.length > 0 ? (
                <PlayerGraph data={filteredData} playerName={playerData.name} placements={placements} />
              ) : (
                <div className="flex items-center justify-center h-full text-gray-400">
                  No data found during this period
                </div>
              )}
            </div>
          </div>
        </div>

        <GameRecordsSection
          filterKey={gameRecordsFilterKey}
          snapshots={filteredData}
        />
      </DashboardCard>
    </AdPageShell>
  );
}
