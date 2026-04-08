-- ====================================
-- TABLE: clubs
-- Clubs created by users to manage teams and players
-- Only members can view clubs (join via code)
-- ====================================

-- Create subscription_tier enum if not exists
DO $$ BEGIN
  CREATE TYPE subscription_tier AS ENUM ('free', 'basic', 'premium', 'ultimate');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS clubs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  acronym VARCHAR(6) NOT NULL,
  code VARCHAR(8) UNIQUE NOT NULL,
  logo_url TEXT,
  primary_color VARCHAR(7) NOT NULL,
  secondary_color VARCHAR(7) NOT NULL,
  court_background_color VARCHAR(7) NOT NULL DEFAULT '#1a472a',
  court_line_color VARCHAR(7) NOT NULL DEFAULT '#FFFFFF',
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  owner_email VARCHAR(255),
  subscription_tier subscription_tier NOT NULL DEFAULT 'free',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE clubs IS 'Clubs created by users to manage teams and players. Only members can view clubs (join via code).';

-- Indexes
CREATE INDEX IF NOT EXISTS idx_clubs_code ON clubs(code);
CREATE INDEX IF NOT EXISTS idx_clubs_owner ON clubs(owner_id);

-- ====================================
-- ROW LEVEL SECURITY
-- ====================================
ALTER TABLE clubs ENABLE ROW LEVEL SECURITY;

-- Note: "Owners and members can view their clubs" policy is added in 02_create_club_member_table.sql
-- after is_club_member() function is defined, to avoid circular dependency.

-- Policy: Authenticated users can find a club by its code (to join it)
CREATE POLICY "Authenticated users can find clubs by code" ON clubs
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Policy: Authenticated users can create clubs
CREATE POLICY "Users can create clubs" ON clubs
  FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

-- Policy: Only owners can update their clubs
CREATE POLICY "Owners can update their clubs" ON clubs
  FOR UPDATE
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

-- Policy: Only owners can delete their clubs
CREATE POLICY "Owners can delete their clubs" ON clubs
  FOR DELETE
  USING (auth.uid() = owner_id);

-- ====================================
-- TRIGGERS
-- ====================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_clubs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
CREATE TRIGGER clubs_updated_at
  BEFORE UPDATE ON clubs
  FOR EACH ROW
  EXECUTE FUNCTION update_clubs_updated_at();
