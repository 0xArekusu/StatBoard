-- ====================================
-- TABLE: club_members
-- Links users to clubs they have joined
-- Users join clubs via a unique code
-- ====================================

CREATE TABLE IF NOT EXISTS club_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  display_name TEXT,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(club_id, user_id)
);

COMMENT ON TABLE club_members IS 'Links users to clubs they have joined via a unique code.';

-- Indexes
CREATE INDEX IF NOT EXISTS idx_club_members_club_id ON club_members(club_id);
CREATE INDEX IF NOT EXISTS idx_club_members_user_id ON club_members(user_id);

-- ====================================
-- SECURITY DEFINER FUNCTION
-- Function to check club membership without triggering RLS recursion
-- ====================================
CREATE OR REPLACE FUNCTION is_club_member(check_club_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM club_members
    WHERE club_members.club_id = check_club_id
    AND club_members.user_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION is_club_member IS 'Check if current user is a member of the specified club. SECURITY DEFINER bypasses RLS to prevent infinite recursion.';

-- ====================================
-- ROW LEVEL SECURITY
-- ====================================
ALTER TABLE club_members ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own membership (needed for insert().select() to work)
CREATE POLICY "Users can view their own membership" ON club_members
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Club owners and members can view club members
CREATE POLICY "Club owners and members can view club members"
  ON club_members FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM clubs
      WHERE clubs.id = club_members.club_id
      AND clubs.owner_id = auth.uid()
    )
    OR is_club_member(club_members.club_id)
  );

-- Policy: Users can join a club (insert themselves) OR club owner can add members
CREATE POLICY "Users can join clubs or owners can add members"
  ON club_members FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM clubs
      WHERE clubs.id = club_members.club_id
      AND clubs.owner_id = auth.uid()
    )
  );

-- Policy: Users can leave a club (delete themselves) OR club owner can remove members
CREATE POLICY "Users can leave clubs or owners can remove members"
  ON club_members FOR DELETE
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM clubs
      WHERE clubs.id = club_members.club_id
      AND clubs.owner_id = auth.uid()
    )
  );

-- ====================================
-- TRIGGERS
-- ====================================

-- Function to automatically add club owner as member when club is created
CREATE OR REPLACE FUNCTION auto_add_club_owner_as_member()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO club_members (club_id, user_id, email, display_name)
  SELECT NEW.id, NEW.owner_id, au.email,
    COALESCE(au.raw_user_meta_data->>'display_name', au.raw_user_meta_data->>'full_name', au.email)
  FROM auth.users au
  WHERE au.id = NEW.owner_id
  ON CONFLICT (club_id, user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER after_club_insert
  AFTER INSERT ON clubs
  FOR EACH ROW
  EXECUTE FUNCTION auto_add_club_owner_as_member();

-- ====================================
-- NOTE: Policy for members to view clubs is now in 01_create_clubs_table.sql
-- It uses the is_club_member() function defined above
-- ====================================
