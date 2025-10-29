-- ====================================
-- TABLE: matches
-- Store completed basketball matches with final scores
-- ====================================
CREATE TABLE IF NOT EXISTS matches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  club_id UUID REFERENCES clubs(id) ON DELETE SET NULL,
  team_id UUID REFERENCES teams(id) ON DELETE SET NULL,

  -- Match information
  team_a_name TEXT NOT NULL,
  team_b_name TEXT NOT NULL,
  match_format TEXT NOT NULL CHECK(match_format IN ('2_halves', '4_quarters')),
  period_duration INTEGER NOT NULL DEFAULT 1200,

  -- Final scores (match is completed)
  final_score_a INTEGER NOT NULL,
  final_score_b INTEGER NOT NULL,
  score_manually_adjusted BOOLEAN DEFAULT false,

  -- Metadata
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  local_match_id INTEGER,  -- Reference to local SQLite match ID
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  played_at TIMESTAMP WITH TIME ZONE NOT NULL,  -- When the match was actually played
  synced_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()  -- When synced to server
);

-- Indexes for performance
CREATE INDEX idx_matches_club_id ON matches(club_id);
CREATE INDEX idx_matches_team_id ON matches(team_id);
CREATE INDEX idx_matches_created_by ON matches(created_by);
CREATE INDEX idx_matches_played_at ON matches(played_at);
CREATE INDEX idx_matches_local_match_id ON matches(local_match_id);

-- ====================================
-- TABLE: match_players
-- Store players and their actions per match in JSONB format
-- Supports both registered players and temporary players
-- ====================================
CREATE TABLE IF NOT EXISTS match_players (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,

  -- Link to players table (NULL for temporary players)
  player_id UUID REFERENCES players(id) ON DELETE SET NULL,

  -- Player information (snapshot at match time)
  player_number INTEGER NOT NULL,
  player_name TEXT NOT NULL,
  team TEXT NOT NULL CHECK(team IN ('A', 'B')),
  is_starter BOOLEAN NOT NULL DEFAULT TRUE,
  photo_url TEXT,

  -- All player actions stored as JSONB array
  -- Format: [{action_type, specification, points, semantic_x, semantic_y, action_order, period_number, time_in_period, timestamp}, ...]
  actions JSONB DEFAULT '[]'::jsonb,

  -- Pre-calculated stats for quick queries
  total_points INTEGER DEFAULT 0,
  total_shots INTEGER DEFAULT 0,
  total_shots_made INTEGER DEFAULT 0,
  total_rebounds INTEGER DEFAULT 0,
  total_assists INTEGER DEFAULT 0,
  total_steals INTEGER DEFAULT 0,
  total_blocks INTEGER DEFAULT 0,
  total_turnovers INTEGER DEFAULT 0,
  total_fouls INTEGER DEFAULT 0,

  -- Flag for temporary players (not in players table)
  is_temporary BOOLEAN DEFAULT false,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  UNIQUE(match_id, player_number, team)
);

-- Indexes for performance
CREATE INDEX idx_match_players_match_id ON match_players(match_id);
CREATE INDEX idx_match_players_player_id ON match_players(player_id);
CREATE INDEX idx_match_players_actions ON match_players USING GIN (actions);
CREATE INDEX idx_match_players_team ON match_players(match_id, team);

-- ====================================
-- TRIGGERS & FUNCTIONS
-- ====================================

-- Function to automatically calculate stats from actions JSONB
CREATE OR REPLACE FUNCTION calculate_player_stats()
RETURNS TRIGGER AS $$
DECLARE
  action JSONB;
BEGIN
  -- Reset all stats
  NEW.total_points := 0;
  NEW.total_shots := 0;
  NEW.total_shots_made := 0;
  NEW.total_rebounds := 0;
  NEW.total_assists := 0;
  NEW.total_steals := 0;
  NEW.total_blocks := 0;
  NEW.total_turnovers := 0;
  NEW.total_fouls := 0;

  -- Loop through all actions
  FOR action IN SELECT jsonb_array_elements(NEW.actions)
  LOOP
    -- Points
    IF action->>'points' IS NOT NULL THEN
      NEW.total_points := NEW.total_points + (action->>'points')::INTEGER;
    END IF;

    -- Shots
    IF action->>'action_type' = 'shot' THEN
      NEW.total_shots := NEW.total_shots + 1;
      IF action->>'specification' LIKE 'made%' THEN
        NEW.total_shots_made := NEW.total_shots_made + 1;
      END IF;
    END IF;

    -- Rebounds
    IF action->>'action_type' = 'rebound' THEN
      NEW.total_rebounds := NEW.total_rebounds + 1;
    END IF;

    -- Assists
    IF action->>'action_type' = 'assist' THEN
      NEW.total_assists := NEW.total_assists + 1;
    END IF;

    -- Steals
    IF action->>'action_type' = 'steal' THEN
      NEW.total_steals := NEW.total_steals + 1;
    END IF;

    -- Blocks
    IF action->>'action_type' = 'block' THEN
      NEW.total_blocks := NEW.total_blocks + 1;
    END IF;

    -- Turnovers
    IF action->>'action_type' = 'turnover' THEN
      NEW.total_turnovers := NEW.total_turnovers + 1;
    END IF;

    -- Fouls
    IF action->>'action_type' = 'foul' THEN
      NEW.total_fouls := NEW.total_fouls + 1;
    END IF;
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER calculate_match_player_stats
  BEFORE INSERT OR UPDATE OF actions ON match_players
  FOR EACH ROW
  EXECUTE FUNCTION calculate_player_stats();

-- Function to automatically set temporary flag
CREATE OR REPLACE FUNCTION set_temporary_flag()
RETURNS TRIGGER AS $$
BEGIN
  NEW.is_temporary := (NEW.player_id IS NULL);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_match_player_temporary
  BEFORE INSERT OR UPDATE ON match_players
  FOR EACH ROW
  EXECUTE FUNCTION set_temporary_flag();

-- ====================================
-- ROW LEVEL SECURITY
-- ====================================
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE match_players ENABLE ROW LEVEL SECURITY;

-- Matches: Users can view matches from their clubs or their own matches
CREATE POLICY "Users can view club matches"
  ON matches FOR SELECT
  USING (
    club_id IS NULL
    OR EXISTS (
      SELECT 1 FROM club_members
      WHERE club_members.club_id = matches.club_id
      AND club_members.user_id = auth.uid()
    )
    OR created_by = auth.uid()
  );

-- Matches: Users can create matches
CREATE POLICY "Users can create matches"
  ON matches FOR INSERT
  WITH CHECK (created_by = auth.uid());

-- Matches: Users can update their own matches
CREATE POLICY "Users can update their matches"
  ON matches FOR UPDATE
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

-- Matches: Users can delete their own matches
CREATE POLICY "Users can delete their matches"
  ON matches FOR DELETE
  USING (created_by = auth.uid());

-- Match Players: Visible if match is visible
CREATE POLICY "Users can view match players"
  ON match_players FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM matches
      WHERE matches.id = match_players.match_id
      AND (
        matches.created_by = auth.uid()
        OR matches.club_id IN (
          SELECT club_id FROM club_members
          WHERE user_id = auth.uid()
        )
      )
    )
  );

-- Match Players: Match creator can manage players
CREATE POLICY "Match creator can manage players"
  ON match_players FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM matches
      WHERE matches.id = match_players.match_id
      AND matches.created_by = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM matches
      WHERE matches.id = match_players.match_id
      AND matches.created_by = auth.uid()
    )
  );
