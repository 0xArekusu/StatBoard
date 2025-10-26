-- Remove category column from teams table
ALTER TABLE teams DROP COLUMN IF EXISTS category;

-- Drop the index if it exists
DROP INDEX IF EXISTS idx_teams_category;
