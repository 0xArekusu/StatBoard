-- Migration v1.0.7
-- Add handicap and sub tracking columns to matches table
ALTER TABLE matches ADD COLUMN IF NOT EXISTS my_team_handicap INTEGER NOT NULL DEFAULT 0;
ALTER TABLE matches ADD COLUMN IF NOT EXISTS opponent_handicap INTEGER NOT NULL DEFAULT 0;
ALTER TABLE matches ADD COLUMN IF NOT EXISTS has_sub_tracking BOOLEAN NOT NULL DEFAULT false;
