-- Remove display_order column and index from players table
DROP INDEX IF EXISTS idx_players_display_order;
ALTER TABLE players DROP COLUMN IF EXISTS display_order;
