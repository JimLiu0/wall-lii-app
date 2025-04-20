'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useMemo, useState, useRef, useEffect } from 'react';
import { DateTime } from 'luxon';
import PlayerGraph from '@/components/PlayerGraph';
import StatsSummary from '@/components/StatsSummary';
import getPeriodLabel from '@/utils/getPeriodLabel';
import { dedupData } from '@/utils/getDedupData';

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

interface Props {
  player: string;
  region: string;
  view: string;
  offset: number;
  playerData: PlayerData;
}

export default function PlayerProfile({ player, region, view: viewParam, offset, playerData }: Props) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  // Handle escape key and click outside
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsEditing(false);
        setInputValue('');
      }
    };

    const handleClickOutside = (e: MouseEvent) => {
      if (isEditing && formRef.current && !formRef.current.contains(e.target as Node)) {
        setIsEditing(false);
        setInputValue('');
      }
    };

    if (isEditing) {
      document.addEventListener('keydown', handleEscape);
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isEditing]);

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (inputValue.trim() && inputValue !== playerData.name) {
      router.push(`/${inputValue.toLowerCase().trim()}`);
    } else {
      setIsEditing(false);
      setInputValue('');
    }
  };

  const view: TimeView = viewParam === 'w' ? 'week' : viewParam === 'd' ? 'day' : 'all';
  const offsetNum = offset || 0;
  const gameMode = searchParams.get('g') as GameMode || 's';

  let filteredData = useMemo(() => {
    let filtered = playerData.data;

    if (view !== 'all') {
      const now = DateTime.now();
      let startTime: DateTime;
      let endTime: DateTime;

      if (view === 'week') {
        startTime = now.minus({ weeks: offsetNum }).startOf('week').startOf('day');
        endTime = startTime.plus({ weeks: 1 });
      } else {
        startTime = now.minus({ days: offsetNum }).startOf('day');
        endTime = startTime.plus({ days: 1 });
      }

      // Get data in current window
      filtered = playerData.data.filter((item) => {
        const itemTime = DateTime.fromISO(item.snapshot_time);
        return itemTime >= startTime && itemTime <= endTime;
      });

      // Get all data before current window
      const previousWindowData = playerData.data
        .filter(item => DateTime.fromISO(item.snapshot_time) < startTime)
        .sort((a, b) => DateTime.fromISO(b.snapshot_time).toMillis() - DateTime.fromISO(a.snapshot_time).toMillis());

      // If we have data in current window
      if (filtered.length > 0) {

        // Get all entries before the window
        const beforeWindow = previousWindowData.filter(item =>
          DateTime.fromISO(item.snapshot_time) < startTime
        ).sort((a, b) =>
          DateTime.fromISO(b.snapshot_time).toMillis() - DateTime.fromISO(a.snapshot_time).toMillis()
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
  }, [playerData.data, view, offsetNum]);

  filteredData = dedupData(filteredData);

  const updateView = (newView: TimeView) => {
    const periodMap = { all: 's', week: 'w', day: 'd' };
    const params = new URLSearchParams(searchParams);
    params.set('v', periodMap[newView]);
    params.set('o', '0');
    router.push(`/${player}?${params.toString()}`);
  };

  const updateOffset = (newOffset: number) => {
    const params = new URLSearchParams(searchParams);
    params.set('o', newOffset.toString());
    router.push(`/${player}?${params.toString()}`);
  };

  const updateGameMode = (newGameMode: GameMode) => {
    const params = new URLSearchParams(searchParams);
    params.set('g', newGameMode);
    router.push(`/${player}?${params.toString()}`);
  };

  const updateRegion = (newRegion: string) => {
    const params = new URLSearchParams(searchParams);
    params.set('r', newRegion.toLowerCase());
    router.push(`/${player}?${params.toString()}`);
  };

  const { availableModes } = playerData;
  const { availableCombos } = availableModes;

  // Helper function to check if a combination exists
  const hasCombo = (r: string, gm: string) =>
    availableCombos.includes(`${r.toLowerCase()}-${gm === 'd' ? '1' : '0'}`);

  // Determine which buttons to show
  const showSoloButton = hasCombo(region, 's');
  const showDuoButton = hasCombo(region, 'd');
  const showRegionButtons = availableModes.regions.filter(r =>
    hasCombo(r, gameMode)  // Only show regions that have data for the current game mode
  );

  return (
    <div className="container mx-auto p-4">
      <div className="bg-gray-900 rounded-lg p-6">
        <div className="flex flex-col gap-4 mb-8">
          <div className="flex items-center gap-4">
            {isEditing ? (
              <div className="flex flex-col gap-2 w-full">
                <form ref={formRef} onSubmit={handleSubmit} className="flex items-center gap-2">
                  <input
                    ref={inputRef}
                    type="text"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    placeholder={playerData.name}
                    className="text-2xl sm:text-4xl font-bold bg-gray-800 text-white px-3 py-1 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 w-full"
                    autoFocus
                  />
                  <div className="flex gap-2 shrink-0">
                    <button
                      type="submit"
                      className="p-2 hover:bg-gray-700 rounded transition-colors"
                    >
                      ✓
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsEditing(false);
                        setInputValue('');
                      }}
                      className="p-2 hover:bg-gray-700 rounded transition-colors"
                    >
                      ✕
                    </button>
                  </div>
                </form>
              </div>
            ) : (
              <div
                className="group flex items-center gap-2 cursor-pointer w-full border border-gray-600"
                onClick={() => {
                  setIsEditing(true);
                  setTimeout(() => inputRef.current?.focus(), 0);
                }}
              >
                <h1 className="text-2xl sm:text-4xl font-bold text-white group-hover:text-gray-300 transition-colors break-all">
                  {playerData.name}
                </h1>
                <div className="text-gray-400 flex items-center gap-1 shrink-0">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" className="bi bi-search" viewBox="0 0 16 16">
                    <path d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001q.044.06.098.115l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1 1 0 0 0-.115-.1zM12 6.5a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0" />
                  </svg>
                </div>
              </div>
            )}
          </div>

          <div className="flex gap-8">
            <div>
              <div className="text-gray-400 text-sm">Rank</div>
              <div className="text-2xl text-white">{playerData.rank}</div>
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
          <div className="w-full md:w-2/3">
            <div className="mb-6">
              <div className="flex flex-wrap gap-4 items-center mb-4">
                <div className="flex gap-2">
                  {showSoloButton && (
                    <button
                      onClick={() => gameMode !== 's' && updateGameMode('s')}
                      className={`px-3 py-2 rounded transition-colors ${gameMode === 's'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                        }`}
                    >
                      Solo
                    </button>
                  )}
                  {showDuoButton && (
                    <button
                      onClick={() => gameMode !== 'd' && updateGameMode('d')}
                      className={`px-3 py-2 rounded transition-colors ${gameMode === 'd'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                        }`}
                    >
                      Duo
                    </button>
                  )}
                </div>

                <div className="flex gap-2">
                  {showRegionButtons.map((r) => (
                    <button
                      key={r}
                      onClick={() => region !== r && updateRegion(r)}
                      className={`px-3 py-2 rounded transition-colors ${region.toLowerCase() === r.toLowerCase()
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                        }`}
                    >
                      {r.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-2 mt-4">
                {['all', 'week', 'day'].map((value) => (
                  <button
                    key={value}
                    onClick={() => view !== value && updateView(value as TimeView)}
                    className={`px-3 py-2 rounded transition-colors ${view === value
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                      }`}
                  >
                    {value === 'all' ? 'Season' : value.charAt(0).toUpperCase() + value.slice(1)}
                  </button>
                ))}
              </div>

              {view !== 'all' && (
                <div className="flex gap-2 mt-4">
                  <button
                    onClick={() => updateOffset(offsetNum + 1)}
                    className="px-3 py-2 rounded transition-colors bg-gray-800 text-gray-300 hover:bg-gray-700"
                  >
                    ⬅️
                  </button>
                  <button
                    disabled={offsetNum === 0}
                    className={`px-3 py-2 rounded transition-colors ${offsetNum === 0
                      ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                      : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                      }`}
                    onClick={() => updateOffset(0)}
                  >
                    Today
                  </button>
                  <button
                    disabled={offsetNum === 0}
                    className={`px-3 py-2 rounded transition-colors ${offsetNum === 0
                      ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                      : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                      }`}
                    onClick={() => updateOffset(offsetNum - 1)}
                  >
                    ➡️
                  </button>
                </div>
              )}

              <div className="text-xl font-bold text-white mt-4">
                {view === 'all'
                  ? 'Season Rating Record'
                  : `${view === 'week' ? 'Weekly' : 'Daily'} Record - ${getPeriodLabel(view, offsetNum)}`}
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
            <div className="w-full md:w-1/3 flex justify-center items-center">
              <StatsSummary data={filteredData} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}