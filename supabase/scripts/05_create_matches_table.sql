-- ====================================
-- TABLE: matches
-- Store basketball matches with embedded players and stats
-- ====================================

-- Create match_status enum if not exists
DO $$ BEGIN
  CREATE TYPE match_status AS ENUM ('in_progress', 'completed', 'cancelled', 'deleted');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID REFERENCES clubs(id) ON DELETE SET NULL,
  team_id UUID REFERENCES teams(id) ON DELETE SET NULL,

  -- Match Info
  my_team_name TEXT,
  opponent_name TEXT NOT NULL,
  is_home BOOLEAN NOT NULL DEFAULT true,

  -- Match Configuration
  total_periods INTEGER NOT NULL DEFAULT 4,
  period_duration INTEGER NOT NULL DEFAULT 600,
  overtime_duration INTEGER,
  overtime_periods INTEGER NOT NULL DEFAULT 0,

  -- Scores
  my_team_score INTEGER NOT NULL DEFAULT 0,
  opponent_score INTEGER NOT NULL DEFAULT 0,

  -- Match State
  status match_status NOT NULL DEFAULT 'in_progress',
  time_elapsed INTEGER DEFAULT 0,

  -- Embedded Players data (JSONB)
  players JSONB DEFAULT '[]'::jsonb,
  player_stats JSONB DEFAULT '{}'::jsonb,

  -- Timestamps
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  started_at TIMESTAMP WITH TIME ZONE,
  ended_at TIMESTAMP WITH TIME ZONE,
  synced_at TIMESTAMP WITH TIME ZONE
);

COMMENT ON TABLE matches IS 'Basketball matches with embedded players and stats (JSONB). Players and actions are stored directly in the match.';
COMMENT ON COLUMN matches.players IS 'Array of player objects: [{ player_id, player_number, player_name, team, is_starter, photo_url, on_court, playing_time_seconds }]';
COMMENT ON COLUMN matches.player_stats IS 'Object mapping player key to stats: { "player_key": { "actions": [{ action_type, specification, points, semantic_x, semantic_y, ... }] } }';

-- Indexes
CREATE INDEX IF NOT EXISTS idx_matches_club_id ON matches(club_id);
CREATE INDEX IF NOT EXISTS idx_matches_team_id ON matches(team_id);
CREATE INDEX IF NOT EXISTS idx_matches_created_by ON matches(created_by);
CREATE INDEX IF NOT EXISTS idx_matches_status ON matches(status);
CREATE INDEX IF NOT EXISTS idx_matches_players ON matches USING GIN (players);
CREATE INDEX IF NOT EXISTS idx_matches_player_stats ON matches USING GIN (player_stats);

-- ====================================
-- ROW LEVEL SECURITY
-- ====================================
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;

-- Policy: Club members can view club matches
CREATE POLICY "Club members can view club matches"
  ON matches FOR SELECT
  USING (
    club_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM club_members
      WHERE club_members.club_id = matches.club_id
      AND club_members.user_id = auth.uid()
    )
  );

-- Policy: Team owner can view their team matches
CREATE POLICY "Team owner can view their team matches"
  ON matches FOR SELECT
  USING (
    team_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM teams
      WHERE teams.id = matches.team_id
      AND teams.owner_id = auth.uid()
    )
  );

-- Policy: Team owner can create matches for their team
CREATE POLICY "Team owner can create matches"
  ON matches FOR INSERT
  WITH CHECK (
    created_by = auth.uid()
    AND (
      team_id IS NULL
      OR EXISTS (
        SELECT 1 FROM teams
        WHERE teams.id = matches.team_id
        AND teams.owner_id = auth.uid()
      )
    )
  );

-- Policy: Team owner can update their team matches
CREATE POLICY "Team owner can update their matches"
  ON matches FOR UPDATE
  USING (
    created_by = auth.uid()
    AND (
      team_id IS NULL
      OR EXISTS (
        SELECT 1 FROM teams
        WHERE teams.id = matches.team_id
        AND teams.owner_id = auth.uid()
      )
    )
  )
  WITH CHECK (
    created_by = auth.uid()
    AND (
      team_id IS NULL
      OR EXISTS (
        SELECT 1 FROM teams
        WHERE teams.id = matches.team_id
        AND teams.owner_id = auth.uid()
      )
    )
  );

-- Policy: Team owner can delete their team matches
CREATE POLICY "Team owner can delete their matches"
  ON matches FOR DELETE
  USING (
    created_by = auth.uid()
    AND (
      team_id IS NULL
      OR EXISTS (
        SELECT 1 FROM teams
        WHERE teams.id = matches.team_id
        AND teams.owner_id = auth.uid()
      )
    )
  );
