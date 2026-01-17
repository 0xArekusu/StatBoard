-- ====================================
-- TABLE: players
-- Players belong to teams
-- Managed by team owner and club owner
-- ====================================

CREATE TABLE IF NOT EXISTS players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  jersey_number INTEGER NOT NULL CHECK (jersey_number >= 0 AND jersey_number <= 99),
  photo_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(team_id, jersey_number)
);

COMMENT ON TABLE players IS 'Players belong to teams and are managed by team owner and club owner.';

-- Indexes
CREATE INDEX IF NOT EXISTS idx_players_team_id ON players(team_id);

-- ====================================
-- ROW LEVEL SECURITY
-- ====================================
ALTER TABLE players ENABLE ROW LEVEL SECURITY;

-- Policy: Club members can view players of approved teams
CREATE POLICY "Club members can view players of approved teams"
  ON players FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM teams
      JOIN club_members ON club_members.club_id = teams.club_id
      WHERE teams.id = players.team_id
      AND teams.status = 'approved'
      AND club_members.user_id = auth.uid()
    )
  );

-- Policy: Team owner can view their own team players (even if pending)
CREATE POLICY "Team owner can view their players"
  ON players FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM teams
      WHERE teams.id = players.team_id
      AND teams.owner_id = auth.uid()
    )
  );

-- Policy: Team owner can manage their players
CREATE POLICY "Team owner can manage players"
  ON players FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM teams
      WHERE teams.id = players.team_id
      AND teams.owner_id = auth.uid()
    )
  );

-- Policy: Club owner can view all players in their club
CREATE POLICY "Club owner can view club players"
  ON players FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM teams
      JOIN clubs ON clubs.id = teams.club_id
      WHERE teams.id = players.team_id
      AND clubs.owner_id = auth.uid()
    )
  );

-- ====================================
-- TRIGGERS
-- ====================================

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_players_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER players_updated_at
  BEFORE UPDATE ON players
  FOR EACH ROW
  EXECUTE FUNCTION update_players_updated_at();

-- Function to validate player count (min 5, max 13)
CREATE OR REPLACE FUNCTION validate_player_count()
RETURNS TRIGGER AS $$
DECLARE
  player_count INTEGER;
BEGIN
  IF TG_OP = 'DELETE' THEN
    SELECT COUNT(*) INTO player_count
    FROM players
    WHERE team_id = OLD.team_id;

    IF player_count <= 5 THEN
      RAISE EXCEPTION 'Cannot delete player: team must have at least 5 players';
    END IF;

    RETURN OLD;
  ELSIF TG_OP = 'INSERT' THEN
    SELECT COUNT(*) INTO player_count
    FROM players
    WHERE team_id = NEW.team_id;

    IF player_count >= 13 THEN
      RAISE EXCEPTION 'Cannot add player: team cannot have more than 13 players';
    END IF;

    RETURN NEW;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER validate_player_count_trigger
  BEFORE INSERT OR DELETE ON players
  FOR EACH ROW
  EXECUTE FUNCTION validate_player_count();
