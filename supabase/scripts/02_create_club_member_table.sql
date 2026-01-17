-- ====================================
-- TABLE: club_members
-- Links users to clubs they have joined
-- Users join clubs via a unique code
-- ====================================

CREATE TABLE IF NOT EXISTS club_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(club_id, user_id)
);

COMMENT ON TABLE club_members IS 'Links users to clubs they have joined via a unique code.';

-- Indexes
CREATE INDEX IF NOT EXISTS idx_club_members_club_id ON club_members(club_id);
CREATE INDEX IF NOT EXISTS idx_club_members_user_id ON club_members(user_id);

-- ====================================
-- ROW LEVEL SECURITY
-- ====================================
ALTER TABLE club_members ENABLE ROW LEVEL SECURITY;

-- NOTE: No SELECT policy on club_members to avoid infinite recursion with clubs table
-- SELECT access is managed by application logic (queries filtered by club_id)

-- Policy: Users can join a club (insert themselves)
CREATE POLICY "Users can join a club"
  ON club_members FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can leave a club (delete themselves)
CREATE POLICY "Users can leave a club"
  ON club_members FOR DELETE
  USING (auth.uid() = user_id);

-- ====================================
-- TRIGGERS
-- ====================================

-- Function to automatically add club owner as member when club is created
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

-- ====================================
-- UPDATE CLUBS POLICY
-- Add policy for members to view clubs
-- ====================================

-- Add policy for club members to view their clubs
CREATE POLICY "Members can view their clubs" ON clubs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM club_members
      WHERE club_members.club_id = clubs.id
      AND club_members.user_id = auth.uid()
    )
  );
