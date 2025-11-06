/**
 * Remove automatic stats calculation trigger from match_players table
 *
 * Context:
 * Previously, player statistics (total_points, total_shots, etc.) were calculated
 * automatically by a PostgreSQL trigger on insert/update.
 *
 * New approach:
 * Statistics are now calculated in the app (MatchSyncService.calculatePlayerStats)
 * before syncing to Supabase. This is more robust for our offline-first architecture
 * and keeps business logic in the application code where it's testable and maintainable.
 *
 * This migration removes the trigger and function to avoid conflicts.
 */

-- Drop the trigger if it exists
DROP TRIGGER IF EXISTS calculate_match_player_stats_trigger ON match_players;

-- Drop the function if it exists
DROP FUNCTION IF EXISTS calculate_match_player_stats();

-- Add comment to table explaining stats are calculated app-side
COMMENT ON COLUMN match_players.total_points IS 'Total points scored by player (calculated in app before insert)';
COMMENT ON COLUMN match_players.total_shots IS 'Total shots attempted (calculated in app before insert)';
COMMENT ON COLUMN match_players.shots_made IS 'Total shots made (calculated in app before insert)';
COMMENT ON COLUMN match_players.total_rebounds IS 'Total rebounds (calculated in app before insert)';
COMMENT ON COLUMN match_players.total_fouls IS 'Total fouls committed (calculated in app before insert)';
