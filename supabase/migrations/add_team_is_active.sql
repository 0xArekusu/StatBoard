-- Add is_active column to teams table
ALTER TABLE teams ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true NOT NULL;

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_teams_is_active ON teams(is_active);

-- Add comment to explain the column
COMMENT ON COLUMN teams.is_active IS 'Club owner can activate/deactivate teams. Deactivated teams are hidden from team owner.';
