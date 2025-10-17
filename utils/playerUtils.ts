import { supabase } from './supabaseClient';

/**
 * Helper function to get player_id from player_name
 * @param playerName - The player name to look up
 * @returns Promise<string | null> - The player_id or null if not found
 */
export async function getPlayerId(playerName: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('players')
    .select('player_id')
    .eq('player_name', playerName)
    .single();
  
  if (error || !data) {
    console.error('Error fetching player_id for', playerName, ':', error);
    return null;
  }
  
  return data.player_id;
}

/**
 * Helper function to check if a player exists
 * @param playerName - The player name to check
 * @returns Promise<boolean> - True if player exists, false otherwise
 */
export async function playerExists(playerName: string): Promise<boolean> {
  const playerId = await getPlayerId(playerName);
  return playerId !== null;
}

/**
 * Helper function to check if a player exists and has data in leaderboard_snapshots
 * @param playerName - The player name to check
 * @returns Promise<boolean> - True if player exists and has snapshot data, false otherwise
 */
export async function playerExistsInSnapshots(playerName: string): Promise<boolean> {
  // Step 1: Get player_id from players table
  const playerId = await getPlayerId(playerName);
  if (!playerId) {
    return false;
  }

  // Step 2: Check if player_id exists in leaderboard_snapshots
  const { data, error } = await supabase
    .from('leaderboard_snapshots')
    .select('player_id')
    .eq('player_id', playerId)
    .limit(1);

  if (error) {
    console.error('Error checking player snapshots:', error);
    return false;
  }

  return !!data && data.length > 0;
}
