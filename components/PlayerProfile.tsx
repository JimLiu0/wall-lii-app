'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useMemo } from 'react';
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
  const view: TimeView = viewParam === 'w' ? 'week' : viewParam === 'd' ? 'day' : 'all';
  const offsetNum = offset || 0;
  const gameMode = searchParams.get('g') as GameMode || 's';

  const filteredData = useMemo(() => {
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

      filtered = playerData.data.filter((item) => {
        const itemTime = DateTime.fromISO(item.snapshot_time);
        return itemTime >= startTime && itemTime <= endTime;
      });
    }

    return dedupData(filtered);
  }, [playerData.data, view, offsetNum]);

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
  const hasSolo = availableModes.gameModes.includes('0');
  const hasDuo = availableModes.gameModes.includes('1');
  const hasMultipleRegions = availableModes.regions.length > 1;

  return (
    <div className="container mx-auto p-4">
      <div className="bg-gray-900 rounded-lg p-6">
        <div className="flex items-center gap-6 mb-8">
          <div className="relative w-24 h-24">
            <div className="w-24 h-24 rounded-full bg-gray-700 overflow-hidden">
              <div className="w-full h-full bg-gray-600 flex items-center justify-center text-2xl text-gray-400">
                {playerData.name[0].toUpperCase()}
              </div>
            </div>
          </div>

          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-4xl font-bold text-white">{playerData.name}</h1>
              <div className="flex gap-2">
                {hasMultipleRegions ? (
                  availableModes.regions.map((r) => (
                    <button
                      key={r}
                      onClick={() => updateRegion(r)}
                      className={`px-3 py-1 rounded transition-colors ${
                        region.toLowerCase() === r.toLowerCase()
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                      }`}
                    >
                      {r.toUpperCase()}
                    </button>
                  ))
                ) : (
                  <span className="bg-gray-800 px-3 py-1 rounded text-gray-300">
                    {region.toUpperCase()}
                  </span>
                )}
              </div>
            </div>

            <div className="flex gap-8 mt-4">
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
        </div>

        <div className="flex flex-col md:flex-row gap-6">
          <div className="w-full md:w-2/3">
            <div className="mb-6">
              {(hasSolo && hasDuo) && (
                <div className="flex gap-2 mb-4">
                  <button
                    onClick={() => updateGameMode('s')}
                    className={`px-4 py-2 rounded ${
                      gameMode === 's'
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                    }`}
                  >
                    Solo
                  </button>
                  <button
                    onClick={() => updateGameMode('d')}
                    className={`px-4 py-2 rounded ${
                      gameMode === 'd'
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                    }`}
                  >
                    Duo
                  </button>
                </div>
              )}

              {view !== 'all' && (
                <div className="mt-4 flex items-center gap-3 text-white">
                  <button onClick={() => updateOffset(offsetNum + 1)} className="hover:text-blue-500">←</button>
                  <button
                    disabled={offsetNum === 0}
                    className={`hover:text-blue-500 ${offsetNum === 0 ? 'text-gray-500 cursor-not-allowed' : ''}`}
                    onClick={() => updateOffset(0)}
                  >
                    Today
                  </button>
                  <button
                    disabled={offsetNum === 0}
                    className={`hover:text-blue-500 ${offsetNum === 0 ? 'text-gray-500 cursor-not-allowed' : ''}`}
                    onClick={() => updateOffset(offsetNum - 1)}
                  >
                    →
                  </button>
                </div>
              )}
              <div className="flex gap-2 mt-4">
                {['all', 'week', 'day'].map((value) => (
                  <button
                    key={value}
                    onClick={() => updateView(value as TimeView)}
                    className={`px-4 py-2 rounded ${view === value
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                      }`}
                  >
                    {value === 'all' ? 'Season' : value.charAt(0).toUpperCase() + value.slice(1)}
                  </button>
                ))}
              </div>

              <div className="text-xl font-bold text-white mt-4">
                {view === 'all'
                  ? 'Season Rating Record'
                  : `${view === 'week' ? 'Weekly' : 'Daily'} Record - ${getPeriodLabel(view, offsetNum)}`}
              </div>
            </div>

            <div className="h-[300px] w-full">
              <PlayerGraph data={filteredData} />
            </div>
          </div>

          <div className="w-full md:w-1/3 flex justify-center items-center">
            <StatsSummary data={filteredData} />
          </div>
        </div>
      </div>
    </div>
  );
}