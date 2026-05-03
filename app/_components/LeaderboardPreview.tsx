import { supabase } from '@/utils/supabaseClient';
import { unstable_noStore } from 'next/cache';
import { DateTime } from 'luxon';
import LeaderboardPreviewClient from './LeaderboardPreviewClient';

const gameModes = [
  { label: 'Solo', value: '0' as const },
  { label: 'Duo', value: '1' as const },
];

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

export default async function LeaderboardPreview() {
  // Prevent caching for live data
  unstable_noStore();
  
  // Get today and yesterday dates
  const ptNow = DateTime.now().setZone('America/Los_Angeles');
  const today = ptNow.startOf('day').toISODate() || '';
  const yesterday = ptNow.minus({ days: 1 }).startOf('day').toISODate() || '';

  // Fetch leaderboard data: try today first, fallback to yesterday if empty
  let lb: LeaderboardEntry[] = [];
  const timeoutPromise = new Promise<{ data: null; error: { message: string } }>((resolve) => 
    setTimeout(() => resolve({ data: null, error: { message: 'Query timeout after 5 seconds' } }), 5000)
  );
  
  try {
    // Try today's data first
    const todayQueryPromise = supabase
      .from('daily_leaderboard_stats')
      .select(`
        player_id,
        rating, 
        rank, 
        region, 
        game_mode,
        players!inner(player_name)
      `)
      .eq('day_start', today)
      .order('rank', { ascending: true })
      .limit(80);
    
    const todayResult = await Promise.race([todayQueryPromise, timeoutPromise]);
    
    if (todayResult.data) {
      const { data: lbData, error: lbError } = todayResult;
      
      if (lbError) {
        console.error('Error fetching today\'s leaderboard data:', lbError);
      } else if (lbData && lbData.length > 0) {
        // Transform the data to match the expected format
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        lb = lbData.map((entry: any) => ({
          player_name: entry.players.player_name,
          rating: entry.rating,
          rank: entry.rank,
          region: entry.region,
          game_mode: entry.game_mode,
        }));
      }
    } else if (todayResult.error) {
      console.error('Today\'s leaderboard query error:', todayResult.error.message);
    }
    
    // If today returned nothing, try yesterday
    if (lb.length === 0) {
      const yesterdayQueryPromise = supabase
        .from('daily_leaderboard_stats')
        .select(`
          player_id,
          rating, 
          rank, 
          region, 
          game_mode,
          players!inner(player_name)
        `)
        .eq('day_start', yesterday)
        .order('rank', { ascending: true })
        .limit(80);
      
      const yesterdayResult = await Promise.race([yesterdayQueryPromise, timeoutPromise]);
      
      if (yesterdayResult.data) {
        const { data: lbData, error: lbError } = yesterdayResult;
        
        if (lbError) {
          console.error('Error fetching yesterday\'s leaderboard data:', lbError);
        } else if (lbData && lbData.length > 0) {
          // Transform the data to match the expected format
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          lb = lbData.map((entry: any) => ({
            player_name: entry.players.player_name,
            rating: entry.rating,
            rank: entry.rank,
            region: entry.region,
            game_mode: entry.game_mode,
          }));
        }
      } else if (yesterdayResult.error) {
        console.error('Yesterday\'s leaderboard query error:', yesterdayResult.error.message);
      }
    }
  } catch (error) {
    console.error('Error in leaderboard query:', error);
  }

  // Fetch channel data for players in leaderboard
  const playerNames = lb.map((p) => p.player_name);
  let channels: ChannelEntry[] = [];
  if (playerNames.length > 0) {
    const { data: chData, error: chError } = await supabase
      .from('channels')
      .select('channel, player, live, youtube')
      .in('player', playerNames);
    if (chError) {
      console.error('Error fetching channel data:', chError);
    } else {
      channels = chData || [];
    }
  }

  // Build an augmented list without mutating the cached array to avoid duplication
  const baseLB = [...(lb || [])];
  const allAdditions: LeaderboardEntry[] = [];
  for (const obj of gameModes) {
    const mode = obj.value;
    const top10Global = baseLB
      .filter(a => a.region !== 'CN' && a.game_mode === mode)
      .toSorted((a, b) => b.rating - a.rating)
      .slice(0, 10)
      .map((item, index) => ({
        ...item,
        rank: index + 1,
        original_region: item.region,
        region: 'ALL',
      }));
    allAdditions.push(...top10Global);
  }

  const lbAugmented = baseLB.concat(allAdditions);
  
  // Fetch Chinese streamers only for the players we're displaying
  const allPlayerNames = lbAugmented.map(p => p.player_name);
  let chineseStreamerData: { player: string; url: string }[] = [];
  if (allPlayerNames.length > 0) {
    const { data: chineseData, error: chineseError } = await supabase
      .from('chinese_streamers')
      .select('player, url')
      .in('player', allPlayerNames);
    if (chineseError) {
      console.error('Error fetching Chinese streamer data:', chineseError);
    } else {
      chineseStreamerData = chineseData || [];
    }
  }

  return (
    <LeaderboardPreviewClient
      fullData={lbAugmented}
      channelData={channels || []}
      chineseStreamerData={chineseStreamerData}
    />
  );
}