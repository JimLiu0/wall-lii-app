import { supabase } from '@/utils/supabaseClient';
import Link from 'next/link';
import SocialIndicators from './SocialIndicators';
import { DateTime } from 'luxon';
import { unstable_noStore } from 'next/cache';

interface LeaderboardEntry {
  player_name: string;
  rating: number;
  rank: number;
  region: string;
  game_mode: string; // '0' for solo, '1' for duo
}

interface ChannelEntry {
  channel: string;
  player: string;
  live: boolean;
  youtube?: string;
}

function getModeLabel(mode: string) {
  return mode === '1' ? 'Duo' : 'Solo';
}

function getRegionLabel(region: string) {
  switch (region.toLowerCase()) {
    case 'na': return 'Americas';
    case 'eu': return 'Europe';
    case 'ap': return 'Asia Pacific';
    case 'cn': return 'China';
    default: return region;
  }
}

function getWallLiiLeaderboardLink(region: string, mode: string) {
  const regionLower = region.toLowerCase();
  const modeStr = mode === '1' ? 'duo' : 'solo';
  return `/lb/${regionLower}?mode=${modeStr}`;
}

export default async function LiveStreamsTable() {
  // Prevent caching for live data
  unstable_noStore();
  
  // Fetch all live channels
  const { data: channelData, error: channelError } = await supabase
    .from('channels')
    .select('channel, player, live, youtube')
    .eq('live', true);

  if (channelError || !channelData || channelData.length === 0) {
    return null;
  }

  // Get all live player names
  const livePlayers = channelData.map((c: ChannelEntry) => c.player);

  // Get today's date in PT
  const ptNow = DateTime.now().setZone('America/Los_Angeles').startOf('day');
  const today = ptNow.toISODate() || '';

  // Fetch today's leaderboard entries for all live players
  const { data: leaderboardData, error: lbError } = await supabase
    .from('daily_leaderboard_stats')
    .select('player_name, rating, rank, region, game_mode')
    .in('player_name', livePlayers)
    .eq('day_start', today);

  if (lbError || !leaderboardData || leaderboardData.length === 0) {
    return null;
  }

  // For each player, pick the entry with the lowest rank (and highest rating if tie)
  const bestEntryByPlayer = Object.values(
    leaderboardData.reduce((acc: Record<string, LeaderboardEntry>, entry: LeaderboardEntry) => {
      const key = entry.player_name.toLowerCase();
      if (!acc[key]) {
        acc[key] = entry;
      } else {
        const current = acc[key];
        if (
          entry.rank < current.rank ||
          (entry.rank === current.rank && entry.rating > current.rating)
        ) {
          acc[key] = entry;
        }
      }
      return acc;
    }, {})
  ) as LeaderboardEntry[];

  // Sort by rank ascending
  bestEntryByPlayer.sort((a, b) => a.rank - b.rank);

  return (
    <div className="bg-gray-900 rounded-lg p-6 mt-8">
      <h2 className="text-center text-2xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-pink-400 via-red-400 to-yellow-400 drop-shadow-sm mb-6">
        Top Ranked Livestreams
      </h2>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="text-sm font-medium text-zinc-400 border-b border-gray-800">
              <th className="px-4 py-2 text-left">Rank</th>
              <th className="px-4 py-2 text-left">Player</th>
              <th className="px-4 py-2 text-left">Rating</th>
              <th className="px-4 py-2 text-left">Mode</th>
              <th className="px-4 py-2 text-left">Region</th>
            </tr>
          </thead>
          <tbody>
            {bestEntryByPlayer.map((entry: LeaderboardEntry) => (
              <tr key={entry.player_name + entry.region + entry.game_mode} className="border-b border-gray-800 hover:bg-gray-800/50 transition-colors">
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
                <td className="px-4 py-3 text-left text-white">{getModeLabel(entry.game_mode)}</td>
                <td className="px-4 py-3 text-left text-white">
                  <Link
                    href={getWallLiiLeaderboardLink(entry.region, entry.game_mode)}
                    className="text-blue-400 hover:underline"
                  >
                    {getRegionLabel(entry.region)}
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
} 