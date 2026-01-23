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
