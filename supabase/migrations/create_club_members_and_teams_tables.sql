-- Create club_members table
CREATE TABLE IF NOT EXISTS club_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  club_id UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(club_id, user_id)
);

-- Create teams table
CREATE TABLE IF NOT EXISTS teams (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  club_id UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category TEXT,
  gender TEXT CHECK (gender IN ('male', 'female', 'mixed')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX idx_club_members_club_id ON club_members(club_id);
CREATE INDEX idx_club_members_user_id ON club_members(user_id);
CREATE INDEX idx_teams_club_id ON teams(club_id);
CREATE INDEX idx_teams_owner_id ON teams(owner_id);
CREATE INDEX idx_teams_status ON teams(status);

-- Enable Row Level Security
ALTER TABLE club_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;

-- RLS Policies for club_members
-- Anyone can view club members
CREATE POLICY "Anyone can view club members"
  ON club_members FOR SELECT
  USING (true);

-- Users can join a club (insert themselves)
CREATE POLICY "Users can join a club"
  ON club_members FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can leave a club (delete themselves)
CREATE POLICY "Users can leave a club"
  ON club_members FOR DELETE
  USING (auth.uid() = user_id);

-- Club owner can manage members
CREATE POLICY "Club owner can manage members"
  ON club_members FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM clubs
      WHERE clubs.id = club_members.club_id
      AND clubs.owner_id = auth.uid()
    )
  );

-- RLS Policies for teams
-- Anyone can view approved teams
CREATE POLICY "Anyone can view approved teams"
  ON teams FOR SELECT
  USING (status = 'approved' OR auth.uid() = owner_id OR auth.uid() IN (
    SELECT owner_id FROM clubs WHERE clubs.id = teams.club_id
  ));

-- Club members can create teams (with pending status)
CREATE POLICY "Club members can create teams"
  ON teams FOR INSERT
  WITH CHECK (
    auth.uid() = owner_id
    AND EXISTS (
      SELECT 1 FROM club_members
      WHERE club_members.club_id = teams.club_id
      AND club_members.user_id = auth.uid()
    )
  );

-- Team owner can update their own team (but not change status)
CREATE POLICY "Team owner can update their team"
  ON teams FOR UPDATE
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

-- Team owner can delete their own team
CREATE POLICY "Team owner can delete their team"
  ON teams FOR DELETE
  USING (auth.uid() = owner_id);

-- Club owner can update any team (including status)
CREATE POLICY "Club owner can manage all teams"
  ON teams FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM clubs
      WHERE clubs.id = teams.club_id
      AND clubs.owner_id = auth.uid()
    )
  );

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

-- Automatically add club owner as member when club is created
CREATE OR REPLACE FUNCTION auto_add_club_owner_as_member()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO club_members (club_id, user_id)
  VALUES (NEW.id, NEW.owner_id)
  ON CONFLICT (club_id, user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER after_club_insert
  AFTER INSERT ON clubs
  FOR EACH ROW
  EXECUTE FUNCTION auto_add_club_owner_as_member();
