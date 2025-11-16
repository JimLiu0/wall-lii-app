'use client';

import { useState } from 'react';
import Link from 'next/link';
import SocialIndicators from './SocialIndicators';
import ButtonGroup from './ButtonGroup';

const regions = [
  { code: 'all', label: 'ALL'},
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
  return `/lb/${regionLower}/${modeStr}`;
}

interface LeaderboardEntry {
  player_name: string;
  rating: number;
  rank: number;
  region: string;
  game_mode: string;
  original_region?: string;
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

interface LeaderboardPreviewClientProps {
  fullData: LeaderboardEntry[];
  channelData: ChannelEntry[];
  chineseStreamerData: ChineseChannelEntry[];
}

export default function LeaderboardPreviewClient({
  fullData,
  channelData,
  chineseStreamerData,
}: LeaderboardPreviewClientProps) {
  const [selectedRegion, setSelectedRegion] = useState('all');
  const [selectedMode, setSelectedMode] = useState<'0' | '1'>('0');

  const data = fullData.filter(
    (entry) => entry.region.toLowerCase() === selectedRegion && entry.game_mode === selectedMode
  );

  return (
    <div className="bg-gray-900 rounded-lg p-6 mt-6">
      {/* Desktop / md and up */}
      <div className="flex flex-col items-center mb-2">
        <h2 className="flex items-center text-xl font-bold text-white text-center">
          {selectedRegion === 'all' ? 'Global (No CN)' : selectedRegion.toUpperCase()} Leaderboard Preview
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
            </tr>
          </thead>
          <tbody>
            {data.length === 0 ? (
              <tr><td colSpan={4} className="text-center text-gray-400 py-4">No data found.</td></tr>
            ) : (
              data.map((entry) => (
                <tr key={entry.player_name + entry.rank} className="border-b border-gray-800 hover:bg-gray-800/50 transition-colors">
                  <td className="px-4 py-3 text-sm font-medium text-zinc-400">#{entry.rank}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/stats/${entry.player_name}?region=${selectedRegion}&mode=${selectedMode === '0' ? 'solo' : 'duo'}`}
                        className="text-blue-300 font-semibold hover:underline"
                        prefetch={false}
                        target="_blank"
                      >
                        {entry.player_name} {entry.original_region && <span className="text-sm text-gray-400">({entry.original_region})</span>}
                      </Link>
                      <SocialIndicators playerName={entry.player_name} channelData={channelData} chineseStreamerData={chineseStreamerData} />
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

