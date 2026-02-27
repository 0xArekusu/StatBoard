-- ====================================
-- TABLE: teams
-- Teams belong to clubs and are managed by users
-- Teams can be approved, pending, or rejected by club owner
-- ====================================

-- Create team_status enum if not exists
DO $$ BEGIN
  CREATE TYPE team_status AS ENUM ('pending', 'approved', 'rejected');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  club_id UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category TEXT,
  coach_name TEXT,
  coach_photo_url TEXT,
  gender TEXT CHECK (gender IN ('male', 'female', 'mixed')),
  status team_status NOT NULL DEFAULT 'pending',
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_deleted BOOLEAN NOT NULL DEFAULT false,
  deleted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE teams IS 'Teams belong to clubs and are managed by users. Teams require approval from club owner.';

-- Indexes
CREATE INDEX IF NOT EXISTS idx_teams_club_id ON teams(club_id);
CREATE INDEX IF NOT EXISTS idx_teams_owner_id ON teams(owner_id);
CREATE INDEX IF NOT EXISTS idx_teams_status ON teams(status);

-- ====================================
-- ROW LEVEL SECURITY
-- ====================================
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;

-- Policy: Club members can view approved teams
CREATE POLICY "Club members can view approved teams"
  ON teams FOR SELECT
  USING (
    (status = 'approved' AND is_deleted = false)
    AND is_club_member(teams.club_id)
  );

-- Policy: Team owner can view their own team (even if pending)
CREATE POLICY "Team owner can view their team"
  ON teams FOR SELECT
  USING (auth.uid() = owner_id);

-- Policy: Club owner can view all teams in their club
CREATE POLICY "Club owner can view all club teams"
  ON teams FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM clubs
      WHERE clubs.id = teams.club_id
      AND clubs.owner_id = auth.uid()
    )
  );

-- Policy: Club members can create teams (with pending status)
CREATE POLICY "Club members can create teams"
  ON teams FOR INSERT
  WITH CHECK (
    auth.uid() = owner_id
    AND is_club_member(teams.club_id)
  );

-- Policy: Team owner can update their own team
CREATE POLICY "Team owner can update their team"
  ON teams FOR UPDATE
  WITH CHECK (auth.uid() = owner_id);

-- Policy: Team owner can delete their own team
CREATE POLICY "Team owner can delete their team"
  ON teams FOR DELETE
  USING (auth.uid() = owner_id);

-- Policy: Club owner can manage all teams (including status)
CREATE POLICY "Club owner can manage all teams"
  ON teams FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM clubs
      WHERE clubs.id = teams.club_id
      AND clubs.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM clubs
      WHERE clubs.id = teams.club_id
      AND clubs.owner_id = auth.uid()
    )
  );

-- ====================================
-- TRIGGERS
-- ====================================

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_teams_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER teams_updated_at
  BEFORE UPDATE ON teams
  FOR EACH ROW
  EXECUTE FUNCTION update_teams_updated_at();
