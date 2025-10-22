-- Drop existing tables (cascade will drop dependent objects)
DROP TABLE IF EXISTS teams CASCADE;
DROP TABLE IF EXISTS club_members CASCADE;
DROP TABLE IF EXISTS clubs CASCADE;

-- Drop existing functions
DROP FUNCTION IF EXISTS update_clubs_updated_at() CASCADE;
DROP FUNCTION IF EXISTS update_teams_updated_at() CASCADE;
DROP FUNCTION IF EXISTS auto_add_club_owner_as_member() CASCADE;

-- Create clubs table with owner_email
CREATE TABLE clubs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  acronym TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,
  logo_url TEXT,
  primary_color TEXT NOT NULL DEFAULT '#FF0000',
  secondary_color TEXT NOT NULL DEFAULT '#0000FF',
  court_background_color TEXT NOT NULL DEFAULT '#1a472a',
  court_line_color TEXT NOT NULL DEFAULT '#FFFFFF',
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  owner_email TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create club_members table with email
CREATE TABLE club_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  club_id UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(club_id, user_id)
);

-- Create teams table
CREATE TABLE teams (
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

-- Create indexes for faster queries
CREATE INDEX idx_clubs_code ON clubs(code);
CREATE INDEX idx_clubs_owner_id ON clubs(owner_id);
CREATE INDEX idx_club_members_club_id ON club_members(club_id);
CREATE INDEX idx_club_members_user_id ON club_members(user_id);
CREATE INDEX idx_teams_club_id ON teams(club_id);
CREATE INDEX idx_teams_owner_id ON teams(owner_id);
CREATE INDEX idx_teams_status ON teams(status);

-- Enable Row Level Security
ALTER TABLE clubs ENABLE ROW LEVEL SECURITY;
ALTER TABLE club_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;

-- RLS Policies for clubs
CREATE POLICY "Anyone can view clubs"
  ON clubs FOR SELECT
  USING (true);

CREATE POLICY "Users can create clubs"
  ON clubs FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Club owner can update their club"
  ON clubs FOR UPDATE
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Club owner can delete their club"
  ON clubs FOR DELETE
  USING (auth.uid() = owner_id);

-- RLS Policies for club_members
CREATE POLICY "Anyone can view club members"
  ON club_members FOR SELECT
  USING (true);

CREATE POLICY "Users can join a club"
  ON club_members FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can leave a club"
  ON club_members FOR DELETE
  USING (auth.uid() = user_id);

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
CREATE POLICY "Anyone can view approved teams"
  ON teams FOR SELECT
  USING (status = 'approved' OR auth.uid() = owner_id OR auth.uid() IN (
    SELECT owner_id FROM clubs WHERE clubs.id = teams.club_id
  ));

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

CREATE POLICY "Team owner can update their team"
  ON teams FOR UPDATE
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Team owner can delete their team"
  ON teams FOR DELETE
  USING (auth.uid() = owner_id);

CREATE POLICY "Club owner can manage all teams"
  ON teams FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM clubs
      WHERE clubs.id = teams.club_id
      AND clubs.owner_id = auth.uid()
    )
  );

-- Triggers
CREATE OR REPLACE FUNCTION update_clubs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER clubs_updated_at
  BEFORE UPDATE ON clubs
  FOR EACH ROW
  EXECUTE FUNCTION update_clubs_updated_at();

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
  INSERT INTO club_members (club_id, user_id, email)
  VALUES (NEW.id, NEW.owner_id, NEW.owner_email)
  ON CONFLICT (club_id, user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER after_club_insert
  AFTER INSERT ON clubs
  FOR EACH ROW
  EXECUTE FUNCTION auto_add_club_owner_as_member();

-- Insert mock data
-- Note: Replace 'YOUR_USER_ID' and 'YOUR_EMAIL' with actual values from your auth.users table
-- You can find your user_id by running: SELECT id, email FROM auth.users;

INSERT INTO clubs (
  id,
  name,
  acronym,
  code,
  logo_url,
  primary_color,
  secondary_color,
  court_background_color,
  court_line_color,
  owner_id,
  owner_email
) VALUES (
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890'::uuid,
  'Los Angeles Lakers',
  'LAL',
  '123456',
  NULL,
  '#552583',
  '#FDB927',
  '#1a472a',
  '#FFFFFF',
  'YOUR_USER_ID'::uuid,  -- Replace with your actual user_id
  'YOUR_EMAIL'           -- Replace with your actual email
);

-- Mock club member (another user joining the club)
-- Uncomment and replace with actual user data if you want to add more members
/*
INSERT INTO club_members (club_id, user_id, email) VALUES (
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890'::uuid,
  'ANOTHER_USER_ID'::uuid,
  'member@example.com'
);
*/

-- Mock approved team
INSERT INTO teams (
  name,
  club_id,
  owner_id,
  category,
  gender,
  status
) VALUES (
  'Lakers Seniors',
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890'::uuid,
  'YOUR_USER_ID'::uuid,  -- Replace with your actual user_id
  'senior',
  'mixed',
  'approved'
);

-- Mock pending team
INSERT INTO teams (
  name,
  club_id,
  owner_id,
  category,
  gender,
  status
) VALUES (
  'Lakers U18',
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890'::uuid,
  'YOUR_USER_ID'::uuid,  -- Replace with your actual user_id
  'u18',
  'male',
  'pending'
);

-- Query to get your user_id and email (run this first to get values for the mock data)
-- SELECT id, email FROM auth.users LIMIT 1;
