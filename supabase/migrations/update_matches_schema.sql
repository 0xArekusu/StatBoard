-- Update matches and match_players tables schema
-- 1. Add team_mode to matches
-- 2. Rename team_a_name to team_a and team_b_name to team_b
-- 3. Remove local_match_id from matches (no longer needed since we delete local data after sync)
-- 4. Remove is_temporary from match_players (redundant with player_id IS NULL)

-- Drop the existing enum type if it exists
DROP TYPE IF EXISTS team_mode_type CASCADE;

-- Create team_mode enum type
CREATE TYPE team_mode_type AS ENUM ('A', 'B', 'BOTH');

-- Drop existing team_mode column if it exists (in case it was created as TEXT)
ALTER TABLE matches
DROP COLUMN IF EXISTS team_mode;

-- Add team_mode column to matches with the enum type
ALTER TABLE matches
ADD COLUMN team_mode team_mode_type NOT NULL;

COMMENT ON COLUMN matches.team_mode IS 'Which team(s) are managed: A, B, or BOTH. Combined with team_id to identify club team.';

-- Rename columns
ALTER TABLE matches
RENAME COLUMN team_a_name TO team_a;

ALTER TABLE matches
RENAME COLUMN team_b_name TO team_b;

COMMENT ON COLUMN matches.team_a IS 'Team A identifier: either team UUID (if club team) or team name string (if temporary)';
COMMENT ON COLUMN matches.team_b IS 'Team B identifier: either team UUID (if club team) or team name string (if temporary)';

-- Drop local_match_id column (no longer needed)
ALTER TABLE matches
DROP COLUMN IF EXISTS local_match_id;

-- Drop is_temporary column from match_players (redundant with player_id IS NULL)
-- First drop the trigger that uses is_temporary
DROP TRIGGER IF EXISTS set_match_player_temporary ON match_players;
DROP FUNCTION IF EXISTS set_temporary_flag();

-- Now drop the column
ALTER TABLE match_players
DROP COLUMN IF EXISTS is_temporary;
