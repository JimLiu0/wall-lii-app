import { supabase } from '@/utils/supabaseClient';
import { unstable_noStore } from 'next/cache';
import { getCurrentLeaderboardDate } from '@/utils/dateUtils';
import { inMemoryCache } from '@/utils/inMemoryCache';
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
  
  const { date: today } = getCurrentLeaderboardDate();

  const lbCacheKey = `preview:lb:${today}`;
  const chCacheKey = `preview:channels:${today}`;
  let lb = inMemoryCache.get<LeaderboardEntry[]>(lbCacheKey);
  let channels = inMemoryCache.get<ChannelEntry[]>(chCacheKey);

  if (!lb) {
    const { data: lbData } = await supabase
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
    
    // Transform the data to match the expected format
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    lb = (lbData || []).map((entry: any) => ({
      player_name: entry.players.player_name,
      rating: entry.rating,
      rank: entry.rank,
      region: entry.region,
      game_mode: entry.game_mode,
    }));
    inMemoryCache.set(lbCacheKey, lb, 5 * 60 * 1000);
  }

  const playerNames = lb?.map((p) => p.player_name) || [];
  if (!channels) {
    const { data: chData } = await supabase
      .from('channels')
      .select('channel, player, live, youtube')
      .in('player', playerNames);
    channels = chData || [];
    inMemoryCache.set(chCacheKey, channels, 5 * 60 * 1000);
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
  const { data: chineseData } = await supabase
    .from('chinese_streamers')
    .select('player, url')
    .in('player', allPlayerNames);
  const chineseStreamerData = chineseData || [];

  return (
    <LeaderboardPreviewClient
      fullData={lbAugmented}
      channelData={channels || []}
      chineseStreamerData={chineseStreamerData}
    />
  );
}