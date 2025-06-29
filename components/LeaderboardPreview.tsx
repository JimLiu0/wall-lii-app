'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/utils/supabaseClient';
import Link from 'next/link';
import SocialIndicators from './SocialIndicators';
import { DateTime } from 'luxon';
import ButtonGroup from './ButtonGroup';

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
  const [mounted, setMounted] = useState(false);
  const [selectedRegion, setSelectedRegion] = useState('na');
  const [selectedMode, setSelectedMode] = useState<'0' | '1'>('0');
  const [data, setData] = useState<LeaderboardEntry[]>([]);
  const [channelData, setChannelData] = useState<ChannelEntry[]>([]);
  const [loading, setLoading] = useState(true);

  // Initialize from localStorage after mounting to prevent hydration mismatch
  useEffect(() => {
    const storedRegion = localStorage.getItem('preferredRegion') || 'na';
    const storedGameMode = localStorage.getItem('preferredGameMode') || 'solo';
    
    setSelectedRegion(storedRegion);
    setSelectedMode(storedGameMode === 'duo' ? '1' : '0');
    setMounted(true);
  }, []);

  // Save preferences to localStorage when they change
  useEffect(() => {
    if (!mounted) return; // Don't save until after initial load
    
    localStorage.setItem('preferredRegion', selectedRegion);
    localStorage.setItem('preferredGameMode', selectedMode === '1' ? 'duo' : 'solo');
    
    // Dispatch custom event to notify other components in the same tab
    window.dispatchEvent(new Event('localStorageChange'));
  }, [selectedRegion, selectedMode, mounted]);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      const ptNow = DateTime.now().setZone('America/Los_Angeles').startOf('day');
      const today = ptNow.toISODate() || '';
      // Get top 10 for region/mode
      const { data: lb } = await supabase
        .from('daily_leaderboard_stats')
        .select('player_name, rating, rank, region, game_mode')
        .eq('region', selectedRegion.toUpperCase())
        .eq('game_mode', selectedMode)
        .eq('day_start', today)
        .order('rank', { ascending: true })
        .limit(10);
      // Get channel data for these players
      const playerNames = lb?.map((p) => p.player_name) || [];
      const { data: channels } = await supabase
        .from('channels')
        .select('channel, player, live, youtube')
        .in('player', playerNames);
      setData(lb || []);
      setChannelData(channels || []);
      setLoading(false);
    }
    fetchData();
  }, [selectedRegion, selectedMode]);

  return (
    <div className="bg-gray-900 rounded-lg p-6 mt-8">
      {/* Desktop / md and up */}
      <div className="flex flex-col items-center mb-2">
        <h2 className="flex items-center text-xl font-bold text-white">
          Leaderboard Preview
        </h2>
        <Link
          href={getWallLiiLeaderboardLink(selectedRegion, selectedMode)}
          className="text-blue-400 hover:underline font-semibold"
        >
          Full Leaderboards →
        </Link>
      </div>

      {/* Mobile / below md */}
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
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="text-sm font-medium text-zinc-400 border-b border-gray-800">
              <th className="px-4 py-2 text-left">Rank</th>
              <th className="px-4 py-2 text-left">Player</th>
              <th className="px-4 py-2 text-left">Rating</th>
              <th className="px-4 py-2 text-left">Mode</th>
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
                  <td className="px-4 py-3 text-left text-white">{entry.game_mode === '1' ? 'Duo' : 'Solo'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
} 