-- Create clubs table
CREATE TABLE IF NOT EXISTS clubs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(30) NOT NULL,
  acronym VARCHAR(5) NOT NULL,
  code VARCHAR(6) UNIQUE NOT NULL,
  logo_url TEXT,
  primary_color VARCHAR(7) NOT NULL,
  secondary_color VARCHAR(7) NOT NULL,
  court_background_color VARCHAR(7) NOT NULL DEFAULT '#1a472a',
  court_line_color VARCHAR(7) NOT NULL DEFAULT '#FFFFFF',
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on code for fast lookups
CREATE INDEX IF NOT EXISTS idx_clubs_code ON clubs(code);

-- Create index on owner_id for fast user club queries
CREATE INDEX IF NOT EXISTS idx_clubs_owner ON clubs(owner_id);

-- Enable Row Level Security
ALTER TABLE clubs ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read all clubs (for joining)
CREATE POLICY "Anyone can view clubs" ON clubs
  FOR SELECT
  USING (true);

-- Policy: Users can create their own clubs
CREATE POLICY "Users can create clubs" ON clubs
  FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

-- Policy: Users can update their own clubs
CREATE POLICY "Users can update own clubs" ON clubs
  FOR UPDATE
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

-- Policy: Users can delete their own clubs
CREATE POLICY "Users can delete own clubs" ON clubs
  FOR DELETE
  USING (auth.uid() = owner_id);

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
