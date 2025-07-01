'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/utils/supabaseClient';
import Link from 'next/link';
import SocialIndicators from './SocialIndicators';
import ButtonGroup from './ButtonGroup';
import { getCurrentLeaderboardDate } from '@/utils/dateUtils';

const regions = [
  { code: 'na', label: 'NA' },
  { code: 'eu', label: 'EU' },
  { code: 'ap', label: 'AP' },
  { code: 'cn', label: 'CN' },
];

const gameModes = [
  { label: 'Solo', value: '0' as const },
  { label: 'Duo', value: '1' as const },
];

function getWallLiiLeaderboardLink(region: string, mode: string) {
  const regionLower = region.toLowerCase();
  const modeStr = mode === '1' ? 'duo' : 'solo';
  return `/lb/${regionLower}?mode=${modeStr}`;
}

interface LeaderboardEntry {
  player_name: string;
  rating: number;
  rank: number;
  region: string;
  game_mode: string;
}

interface ChannelEntry {
  channel: string;
  player: string;
  live: boolean;
  youtube?: string;
}

export default function LeaderboardPreview() {
  const isClient = typeof window !== 'undefined';
  const storedRegion = isClient ? localStorage.getItem('preferredRegion') : null;
  const storedGameMode = isClient ? localStorage.getItem('preferredGameMode') : null;
  const [selectedRegion, setSelectedRegion] = useState(storedRegion || 'na');
  const [selectedMode, setSelectedMode] = useState<'0' | '1'>(
    storedGameMode === 'duo' ? '1' : '0'
  );
  const [fullData, setFullData] = useState<LeaderboardEntry[]>([]);
  const [channelData, setChannelData] = useState<ChannelEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Save preferences to localStorage when they change
  useEffect(() => {
    localStorage.setItem('preferredRegion', selectedRegion);
    localStorage.setItem('preferredGameMode', selectedMode === '1' ? 'duo' : 'solo');
    
    // Dispatch custom event to notify other components in the same tab
    window.dispatchEvent(new Event('localStorageChange'));
  }, [selectedRegion, selectedMode]);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      const { date: today } = await getCurrentLeaderboardDate();

      const { data: lb } = await supabase
        .from('daily_leaderboard_stats')
        .select('player_name, rating, rank, region, game_mode')
        .eq('day_start', today)
        .order('rank', { ascending: true })
        .limit(80);

      const playerNames = lb?.map((p) => p.player_name) || [];
      const { data: channels } = await supabase
        .from('channels')
        .select('channel, player, live, youtube')
        .in('player', playerNames);

      setFullData(lb || []);
      setChannelData(channels || []);
      setLoading(false);
    }
    fetchData();
  }, []);

  const data = fullData.filter(
    (entry) => entry.region.toLowerCase() === selectedRegion && entry.game_mode === selectedMode
  );

  return (
    <div className="bg-gray-900 rounded-lg p-6 mt-6">
      {/* Desktop / md and up */}
      <div className="flex flex-col items-center mb-2">
        <h2 className="flex items-center text-xl font-bold text-white">
          Leaderboard Preview
        </h2>
        {/* Mount guard to prevent hydration mismatch from localStorage defaults */}
        {mounted && (
          <Link
            href={getWallLiiLeaderboardLink(selectedRegion, selectedMode)}
            className="text-blue-400 hover:underline font-semibold"
          >
            Full Leaderboards →
          </Link>
        )}
      </div>

      {/* Mobile / below md */}
      {/* Mount guard to prevent hydration mismatch for toggle defaults */}
      {mounted && (
        <div className="flex flex-wrap justify-center gap-2 mb-4 items-center">
          <ButtonGroup
            options={regions.map(r => ({ label: r.label, value: r.code }))}
            selected={selectedRegion}
            onChange={setSelectedRegion}
          />
          <ButtonGroup
            options={gameModes}
            selected={selectedMode}
            onChange={val => setSelectedMode(val as '0' | '1')}
          />
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="text-sm font-medium text-zinc-400 border-b border-gray-800">
              <th className="px-4 py-2 text-left">Rank</th>
              <th className="px-4 py-2 text-left">Player</th>
              <th className="px-4 py-2 text-left">Rating</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={4} className="text-center text-gray-400 py-4">Loading...</td></tr>
            ) : data.length === 0 ? (
              <tr><td colSpan={4} className="text-center text-gray-400 py-4">No data found.</td></tr>
            ) : (
              data.map((entry) => (
                <tr key={entry.player_name + entry.rank} className="border-b border-gray-800 hover:bg-gray-800/50 transition-colors">
                  <td className="px-4 py-3 text-sm font-medium text-zinc-400">#{entry.rank}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/stats/${entry.player_name}?r=${entry.region.toLowerCase()}`}
                        className="text-blue-300 font-semibold hover:underline"
                        target="_blank"
                      >
                        {entry.player_name}
                      </Link>
                      <SocialIndicators playerName={entry.player_name} channelData={channelData} />
                    </div>
                  </td>
                  <td className="px-4 py-3 text-left text-lg font-semibold text-white">{entry.rating}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}