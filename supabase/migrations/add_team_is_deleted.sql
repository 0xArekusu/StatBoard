-- Add is_deleted column to teams table for soft delete
ALTER TABLE teams ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT false NOT NULL;
ALTER TABLE teams ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_teams_is_deleted ON teams(is_deleted);

-- Add comment to explain the columns
COMMENT ON COLUMN teams.is_deleted IS 'Soft delete flag. Deleted teams are archived but not physically removed from database.';
COMMENT ON COLUMN teams.deleted_at IS 'Timestamp when team was deleted/archived.';
