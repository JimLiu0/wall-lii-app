import { supabase } from '@/utils/supabaseClient';
import Link from 'next/link';
import SocialIndicators from './SocialIndicators';
import { unstable_noStore } from 'next/cache';
import { getCurrentLeaderboardDate } from '@/utils/dateUtils';
import { inMemoryCache } from '@/utils/inMemoryCache';

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

function getWallLiiLeaderboardLink(region: string, mode: string) {
  const regionLower = region.toLowerCase();
  const modeStr = mode === '1' ? 'duo' : 'solo';
  return `/lb/${regionLower}?mode=${modeStr}`;
}

export default async function LiveStreamsTable() {
  // Prevent caching for live data
  unstable_noStore();
  
  // Fetch all live channels (cache for 5 min)
  const channelCacheKey = 'livestreams:channels';
  let channelData = inMemoryCache.get<ChannelEntry[]>(channelCacheKey);
  if (!channelData) {
    const { data: fetched, error } = await supabase
      .from('channels')
      .select('channel, player, live, youtube')
      .eq('live', true);
    if (error || !fetched || fetched.length === 0) {
      return null;
    }
    channelData = fetched;
    inMemoryCache.set(channelCacheKey, channelData, 5 * 60 * 1000);
  }

  // Get all live player names
  const livePlayers = channelData.map((c: ChannelEntry) => c.player);

  // Get the appropriate date for leaderboard queries (with fallback)
  const { date: today } = await getCurrentLeaderboardDate();

  // Fetch today's leaderboard entries for all live players (cache for 5 min)
  const lbCacheKey = `livestreams:lb:${today}`;
  let leaderboardData = inMemoryCache.get<LeaderboardEntry[]>(lbCacheKey);
  if (!leaderboardData) {
    const { data: fetched, error } = await supabase
      .from('daily_leaderboard_stats')
      .select('player_name, rating, rank, region, game_mode')
      .in('player_name', livePlayers)
      .eq('day_start', today);
    if (error || !fetched || fetched.length === 0) {
      return null;
    }
    leaderboardData = fetched;
    inMemoryCache.set(lbCacheKey, leaderboardData, 5 * 60 * 1000);
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
    <div className="bg-gray-900 rounded-lg p-6 mt-6">
      <h2 className="text-center text-xl font-bold text-white">
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
                    {entry.region.toUpperCase()}
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