import { supabase } from '@/utils/supabaseClient';
import Link from 'next/link';
import SocialIndicators from './SocialIndicators';
import { unstable_noStore } from 'next/cache';
import { DateTime } from 'luxon';

interface LeaderboardEntry {
  player_name: string;
  rating: number;
  rank: number;
  region: string;
  game_mode: string; // '0' for solo, '1' for duo
  day_start: string;
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
  return `/lb/${regionLower}/${modeStr}`;
}

export default async function LiveStreamsTable() {
  // Prevent caching for live data
  unstable_noStore();
  
  // Fetch all live channels
  const { data: fetchedChannels, error: channelError } = await supabase
    .from('channels')
    .select('channel, player, live, youtube')
    .eq('live', true);
  
  if (channelError) {
    console.error('Error fetching live channels:', channelError);
  }
  
  const channelData = fetchedChannels || [];
  
  // Early return only if channels query returns zero rows
  if (channelData.length === 0) {
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

  // Fetch Chinese streamer data
  const { data: fetchedChinese, error: chineseError } = await supabase
    .from('chinese_streamers')
    .select('player, url');
  
  if (chineseError) {
    console.error('Error fetching Chinese streamer data:', chineseError);
  }
  
  const chineseStreamerData = fetchedChinese || [];

  // Get all live player names
  const livePlayers = channelData.map((c: ChannelEntry) => c.player);

  // Get today and yesterday dates for leaderboard queries
  const ptNow = DateTime.now().setZone('America/Los_Angeles');
  const today = ptNow.startOf('day').toISODate() || '';
  const yesterday = ptNow.minus({ days: 1 }).startOf('day').toISODate() || '';

  // First, get player_ids for all live players (more efficient than joining by name)
  const playerIdMap = new Map<string, string>(); // player_name -> player_id
  if (livePlayers.length > 0) {
    try {
      const queryPromise = supabase
        .from('players')
        .select('player_id, player_name')
        .in('player_name', livePlayers);
      
      // Add timeout protection (3 seconds)
      const timeoutPromise = new Promise<{ data: null; error: { message: string } }>((resolve) => 
        setTimeout(() => resolve({ data: null, error: { message: 'Query timeout after 3 seconds' } }), 3000)
      );
      
      const result = await Promise.race([queryPromise, timeoutPromise]);
      
      if (result.data) {
        const { data: playerData, error: playerError } = result;
        
        if (playerError) {
          console.error('Error fetching player IDs:', playerError);
        } else if (playerData) {
          playerData.forEach((p: { player_id: string; player_name: string }) => {
            playerIdMap.set(p.player_name.toLowerCase(), p.player_id);
          });
        }
      } else if (result.error) {
        console.error('Player ID query error:', result.error.message);
      }
    } catch (error) {
      console.error('Error in player ID query:', error);
    }
  }

  // Fetch leaderboard entries for today or yesterday, taking most recent per player
  const leaderboardMap = new Map<string, LeaderboardEntry>();
  const playerIds = Array.from(playerIdMap.values());
  
  if (playerIds.length > 0) {
    try {
      const queryPromise = supabase
        .from('daily_leaderboard_stats')
        .select(`
          player_id,
          rating, 
          rank, 
          region, 
          game_mode,
          day_start,
          players!inner(player_name)
        `)
        .in('player_id', playerIds)
        .in('day_start', [today, yesterday])
        .order('day_start', { ascending: false });
      
      // Add timeout protection (5 seconds)
      const timeoutPromise = new Promise<{ data: null; error: { message: string } }>((resolve) => 
        setTimeout(() => resolve({ data: null, error: { message: 'Query timeout after 5 seconds' } }), 5000)
      );
      
      const result = await Promise.race([queryPromise, timeoutPromise]);
      
      if (result.data) {
        const { data: fetchedLb, error: lbError } = result;
        
        if (lbError) {
          console.error('Error fetching leaderboard data for live streamers:', lbError);
        } else if (fetchedLb) {
          // Since ordered by day_start DESC, first entry per player is most recent
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          fetchedLb.forEach((entry: any) => {
            const playerName = entry.players.player_name.toLowerCase();
            if (!leaderboardMap.has(playerName)) {
              leaderboardMap.set(playerName, {
                player_name: entry.players.player_name,
                rating: entry.rating,
                rank: entry.rank,
                region: entry.region,
                game_mode: entry.game_mode,
                day_start: entry.day_start,
              });
            }
          });
        }
      } else if (result.error) {
        console.error('Leaderboard query error:', result.error.message);
      }
    } catch (error) {
      console.error('Error in leaderboard query:', error);
    }
  }

  // Filter to only show live players who have leaderboard data
  const tableRows = channelData
    .map((channel: ChannelEntry) => {
      const playerName = channel.player;
      const lbEntry = leaderboardMap.get(playerName.toLowerCase());
      return {
        player_name: playerName,
        channel: channel,
        leaderboard: lbEntry || null,
      };
    })
    .filter((row) => row.leaderboard !== null); // Only show players with leaderboard data

  // Sort by rank ascending
  tableRows.sort((a, b) => {
    if (a.leaderboard && b.leaderboard) {
      return a.leaderboard.rank - b.leaderboard.rank;
    }
    return 0;
  });

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
            {tableRows.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-gray-400">
                  No live streamers currently on the leaderboard
                </td>
              </tr>
            ) : (
              tableRows.map((row) => (
                <tr key={row.player_name} className="border-b border-gray-800 hover:bg-gray-800/50 transition-colors">
                  <td className="px-4 py-3 text-sm font-medium text-zinc-400">
                    #{row.leaderboard!.rank}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/stats/${row.player_name}`}
                        className="text-blue-300 font-semibold hover:underline"
                        prefetch={false}
                        target="_blank"
                      >
                        {row.player_name}
                      </Link>
                      <SocialIndicators playerName={row.player_name} channelData={channelData} chineseStreamerData={chineseStreamerData} />
                    </div>
                  </td>
                  <td className="px-4 py-3 text-left text-lg font-semibold text-white">
                    {row.leaderboard!.rating}
                  </td>
                  <td className="px-4 py-3 text-left text-white">
                    {getModeLabel(row.leaderboard!.game_mode)}
                  </td>
                  <td className="px-4 py-3 text-left text-white">
                    <Link
                      href={getWallLiiLeaderboardLink(row.leaderboard!.region, row.leaderboard!.game_mode)}
                      className="text-blue-400 hover:underline"
                    >
                      {row.leaderboard!.region.toUpperCase()}
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
} 