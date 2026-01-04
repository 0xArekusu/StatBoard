-- =====================================================
-- Cleanup Script: Remove match_players table
-- =====================================================
-- This script removes the legacy match_players table after
-- migrating to embedded players in matches.players and matches.player_stats
--
-- Run this AFTER confirming the refactor is working in production
-- =====================================================

-- Step 1: Drop all policies on match_players
DROP POLICY IF EXISTS "Users can view their match players" ON match_players;
DROP POLICY IF EXISTS "Users can insert their match players" ON match_players;
DROP POLICY IF EXISTS "Users can update their match players" ON match_players;
DROP POLICY IF EXISTS "Users can delete their match players" ON match_players;

-- Step 2: Drop all triggers on match_players
DROP TRIGGER IF EXISTS update_match_players_updated_at ON match_players;

-- Step 3: Drop all indexes on match_players
DROP INDEX IF EXISTS idx_match_players_match_id;
DROP INDEX IF EXISTS idx_match_players_player_id;
DROP INDEX IF EXISTS idx_match_players_team;

-- Step 4: Drop all functions related to match_players
DROP FUNCTION IF EXISTS update_match_players_timestamp() CASCADE;

-- Step 5: Finally drop the table with CASCADE to remove any remaining dependencies
DROP TABLE IF EXISTS match_players CASCADE;

-- Verification: Confirm table is gone
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'match_players') THEN
    RAISE NOTICE '✅ match_players table successfully removed';
  ELSE
    RAISE EXCEPTION '❌ match_players table still exists';
  END IF;
END $$;
