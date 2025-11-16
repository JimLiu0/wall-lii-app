import { supabase } from '@/utils/supabaseClient';
import Link from 'next/link';
import SocialIndicators from './SocialIndicators';
import { unstable_noStore } from 'next/cache';
import { getCurrentLeaderboardDate } from '@/utils/dateUtils';
import { inMemoryCache } from '@/utils/inMemoryCache';
import { toNewUrlParams } from '@/utils/urlParams';
import { DateTime } from 'luxon';

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

interface ChineseChannelEntry {
  player: string;
  url: string;
}

function getModeLabel(mode: string) {
  return mode === '1' ? 'Duo' : 'Solo';
}

function getWallLiiLeaderboardLink(region: string, mode: string) {
  const regionLower = region.toLowerCase();
  const modeStr = mode === '1' ? 'duo' : 'solo';
  return `/lb/${regionLower}/${modeStr}`;
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
    if (error) {
      console.error('Error fetching live channels:', error);
      // Don't return early on error, continue with empty array
      channelData = [];
    } else if (!fetched || fetched.length === 0) {
      // Legitimately no live streamers
      channelData = [];
    } else {
      channelData = fetched;
      // Only cache successful results
      inMemoryCache.set(channelCacheKey, channelData, 5 * 60 * 1000);
    }
  }

  // Fetch Chinese streamer data
  const chineseCacheKey = 'livestreams:chinese';
  let chineseStreamerData = inMemoryCache.get<ChineseChannelEntry[]>(chineseCacheKey);
  if (!chineseStreamerData) {
    const { data: fetched, error } = await supabase
      .from('chinese_streamers')
      .select('player, url');
    if (error) {
      console.error('Error fetching Chinese streamer data:', error);
      chineseStreamerData = [];
    } else {
      chineseStreamerData = fetched || [];
      // Only cache successful results
      if (chineseStreamerData.length > 0) {
        inMemoryCache.set(chineseCacheKey, chineseStreamerData, 5 * 60 * 1000);
      }
    }
  }

  // Get all live player names
  const livePlayers = channelData.map((c: ChannelEntry) => c.player);

  // Early return if no live players (but only after we've tried to fetch)
  if (livePlayers.length === 0) {
    return (
      <div className="bg-gray-900 rounded-lg p-6 mt-6">
        <h2 className="text-center text-xl font-bold text-white mb-4">
          Top Ranked Livestreams
        </h2>
        <div className="text-center text-gray-400 py-8">
          <p className="text-lg">No streamers currently live who are on the leaderboard</p>
          <p className="text-sm mt-2">Check back later for live streams from top players</p>
        </div>
      </div>
    );
  }

  // Get the appropriate date for leaderboard queries (with fallback)
  const { date: today } = getCurrentLeaderboardDate();

  // Fetch today's leaderboard entries for all live players (cache for 5 min)
  const lbCacheKey = `livestreams:lb:${today}`;
  let leaderboardData = inMemoryCache.get<LeaderboardEntry[]>(lbCacheKey);
  if (!leaderboardData) {
    const { data: fetched, error } = await supabase
      .from('daily_leaderboard_stats')
      .select(`
        player_id,
        rating, 
        rank, 
        region, 
        game_mode,
        players!inner(player_name)
      `)
      .in('players.player_name', livePlayers)
      .eq('day_start', today);
    if (error) {
      console.error('Error fetching leaderboard data for live streamers:', error);
      // Don't return early on error, continue with empty array
      leaderboardData = [];
    } else if (!fetched || fetched.length === 0) {
      // Legitimately no data
      leaderboardData = [];
    } else {
      // Transform the data to match the expected format
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      leaderboardData = (fetched || []).map((entry: any) => ({
        player_name: entry.players.player_name,
        rating: entry.rating,
        rank: entry.rank,
        region: entry.region,
        game_mode: entry.game_mode,
      }));
      // Only cache successful results
      if (leaderboardData.length > 0) {
        inMemoryCache.set(lbCacheKey, leaderboardData, 5 * 60 * 1000);
      }
    }
  }

  // Early return if no leaderboard data
  if (!leaderboardData || leaderboardData.length === 0) {
    return (
      <div className="bg-gray-900 rounded-lg p-6 mt-6">
        <h2 className="text-center text-xl font-bold text-white mb-4">
          Top Ranked Livestreams
        </h2>
        <div className="text-center text-gray-400 py-8">
          <p className="text-lg">No streamers currently live who are on the leaderboard</p>
          <p className="text-sm mt-2">Check back later for live streams from top players</p>
        </div>
      </div>
    );
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
      <div className="flex text-center flex-col">
        <h2 className="text-center text-xl font-bold text-white">
          Top Ranked Livestreams
        </h2>
        <Link
          href={'/help'}
          className="text-blue-400 hover:underline font-semibold"
        >
          Add Your Twitch/Youtube →
        </Link>
      </div>
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
                      href={(() => {
                        const statsUrlParams = toNewUrlParams({
                          region: entry.region.toLowerCase(),
                          mode: entry.game_mode === '1' ? 'duo' : 'solo',
                          view: 'day',
                          date: DateTime.now().setZone('America/Los_Angeles').startOf('day').toISODate()
                        });
                        return `/stats/${entry.player_name}?${statsUrlParams.toString()}`;
                      })()}
                      className="text-blue-300 font-semibold hover:underline"
                      prefetch={false}
                      target="_blank"
                    >
                      {entry.player_name}
                    </Link>
                    <SocialIndicators playerName={entry.player_name} channelData={channelData} chineseStreamerData={chineseStreamerData} />
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