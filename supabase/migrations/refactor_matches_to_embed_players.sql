-- ====================================
-- REFACTOR: Embed players and stats directly in matches table
-- ====================================
-- This migration:
-- 1. Adds players and player_stats JSONB columns to matches
-- 2. Converts status from TEXT to ENUM
-- 3. Removes played_at column (redundant)
-- 4. Drops match_players table (data now embedded in matches)
--
-- NOTE: This is a breaking change - only applies to NEW matches.
-- Existing match data is not migrated.
-- ====================================

-- ====================================
-- STEP 1: Create match_status ENUM type
-- ====================================
CREATE TYPE match_status AS ENUM ('in_progress', 'completed', 'cancelled');

-- ====================================
-- STEP 2: Add new columns to matches table
-- ====================================

-- Add players column: Array of player objects (lightweight info)
-- Structure: [{ player_id, player_number, player_name, team, is_starter, photo_url, on_court, playing_time_seconds }]
ALTER TABLE matches
ADD COLUMN players JSONB DEFAULT '[]'::jsonb;

COMMENT ON COLUMN matches.players IS 'Array of player objects with basic info (player_id, player_number, player_name, team, is_starter, photo_url, on_court, playing_time_seconds)';

-- Add player_stats column: Object mapping player_id to their actions
-- Structure: { "player_id_1": { "actions": [...] }, "player_id_2": { "actions": [...] } }
ALTER TABLE matches
ADD COLUMN player_stats JSONB DEFAULT '{}'::jsonb;

COMMENT ON COLUMN matches.player_stats IS 'Object mapping player_id to their stats: { "player_id": { "actions": [{ action_type, specification, points, semantic_x, semantic_y, ... }] } }';

-- ====================================
-- STEP 3: Update status column to use ENUM
-- ====================================

-- Add new status_enum column
ALTER TABLE matches
ADD COLUMN status_enum match_status;

-- For new matches, we'll use the ENUM directly
-- (No migration of existing data)

-- Drop old status column (if it exists as TEXT)
ALTER TABLE matches
DROP COLUMN IF EXISTS status;

-- Rename status_enum to status
ALTER TABLE matches
RENAME COLUMN status_enum TO status;

-- Set default for new matches
ALTER TABLE matches
ALTER COLUMN status SET DEFAULT 'in_progress'::match_status;

COMMENT ON COLUMN matches.status IS 'Match status: in_progress, completed, or cancelled';

-- ====================================
-- STEP 4: Remove played_at column
-- ====================================
ALTER TABLE matches
DROP COLUMN IF EXISTS played_at;

-- ====================================
-- STEP 5: Add indexes for JSONB columns
-- ====================================
CREATE INDEX idx_matches_players ON matches USING GIN (players);
CREATE INDEX idx_matches_player_stats ON matches USING GIN (player_stats);

-- ====================================
-- STEP 6: Drop match_players table and related objects
-- ====================================

-- Drop triggers first
DROP TRIGGER IF EXISTS calculate_match_player_stats ON match_players;
DROP FUNCTION IF EXISTS calculate_player_stats();

-- Drop indexes
DROP INDEX IF EXISTS idx_match_players_match_id;
DROP INDEX IF EXISTS idx_match_players_player_id;
DROP INDEX IF EXISTS idx_match_players_actions;
DROP INDEX IF EXISTS idx_match_players_team;

-- Drop policies
DROP POLICY IF EXISTS "Users can view match players" ON match_players;
DROP POLICY IF EXISTS "Match creator can manage players" ON match_players;

-- Drop table (CASCADE will drop any remaining foreign keys)
DROP TABLE IF EXISTS match_players CASCADE;

-- ====================================
-- STEP 7: Update matches table columns to align with new schema
-- ====================================

-- Ensure all required columns exist with correct types
-- (team_a, team_b, final_score_a, final_score_b already exist from previous migrations)

-- Update column comments
COMMENT ON TABLE matches IS 'Basketball matches with embedded players and stats (JSONB)';
