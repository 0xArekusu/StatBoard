-- ====================================
-- SCRIPT: Supprimer toutes les tables et buckets
-- ATTENTION: Ceci supprime TOUTES les données !
-- ====================================

-- Drop all tables (CASCADE removes dependencies including triggers and functions)
DROP TABLE IF EXISTS matches CASCADE;
DROP TABLE IF EXISTS players CASCADE;
DROP TABLE IF EXISTS teams CASCADE;
DROP TABLE IF EXISTS club_members CASCADE;
DROP TABLE IF EXISTS clubs CASCADE;
DROP TABLE IF EXISTS subscription_plans CASCADE;

-- Drop all functions (CASCADE for safety)
DROP FUNCTION IF EXISTS check_team_approval_limit() CASCADE;
DROP FUNCTION IF EXISTS update_teams_updated_at() CASCADE;
DROP FUNCTION IF EXISTS auto_add_club_owner_as_member() CASCADE;
DROP FUNCTION IF EXISTS update_clubs_updated_at() CASCADE;
DROP FUNCTION IF EXISTS update_players_updated_at() CASCADE;
DROP FUNCTION IF EXISTS validate_player_count() CASCADE;

-- Drop all enums
DROP TYPE IF EXISTS match_status CASCADE;
DROP TYPE IF EXISTS team_status CASCADE;
DROP TYPE IF EXISTS subscription_tier CASCADE;

-- Drop storage bucket
DELETE FROM storage.objects WHERE bucket_id = 'player-photos';
DELETE FROM storage.buckets WHERE id = 'player-photos';
