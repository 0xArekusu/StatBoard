-- ====================================
-- STORAGE: clubs bucket
-- Store club logos, coach photos, and player photos in hierarchical structure
-- Structure:
--   club-{clubId}/logo-{clubId}.ext                     (club logo)
--   club-{clubId}/team-{teamId}/coach-{teamId}.ext      (coach photos)
--   club-{clubId}/team-{teamId}/player-{playerId}.ext   (player photos)
-- ====================================

-- Create the clubs bucket if it doesn't exist (PRIVATE)
INSERT INTO storage.buckets (id, name, public)
VALUES ('clubs', 'clubs', false)
ON CONFLICT (id) DO NOTHING;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Club members can view club files" ON storage.objects;
DROP POLICY IF EXISTS "Club owners can manage club logo" ON storage.objects;
DROP POLICY IF EXISTS "Club and team owners can manage coach photos" ON storage.objects;
DROP POLICY IF EXISTS "Club and team owners can manage player photos" ON storage.objects;
DROP POLICY IF EXISTS "Team owners can manage coach photos" ON storage.objects;
DROP POLICY IF EXISTS "Team owners can manage player photos" ON storage.objects;

-- ====================================
-- STORAGE POLICIES
-- ====================================

-- Policy 1: Club members can view all files from their club (logos + coach photos + player photos)
CREATE POLICY "Club members can view club files"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'clubs'
    AND (
      -- Club member can view files from their club
      -- Extract clubId from "club-{clubId}/..." path
      is_club_member(substring((string_to_array(storage.objects.name, '/'))[1] from 'club-(.*)$')::uuid)
      OR
      -- Club owner can view files from their club
      EXISTS (
        SELECT 1 FROM clubs
        WHERE clubs.id::text = substring((string_to_array(storage.objects.name, '/'))[1] from 'club-(.*)$')
        AND clubs.owner_id = auth.uid()
      )
    )
  );

-- Policy 2: Club owners can manage their club logo
-- Path format: club-{clubId}/logo-{clubId}.ext
CREATE POLICY "Club owners can manage club logo"
  ON storage.objects FOR ALL
  TO authenticated
  USING (
    bucket_id = 'clubs'
    AND storage.objects.name LIKE 'club-%/logo-%'
    AND EXISTS (
      SELECT 1 FROM clubs
      WHERE clubs.id::text = substring((string_to_array(storage.objects.name, '/'))[1] from 'club-(.*)$')
      AND clubs.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    bucket_id = 'clubs'
    AND storage.objects.name LIKE 'club-%/logo-%'
    AND EXISTS (
      SELECT 1 FROM clubs
      WHERE clubs.id::text = substring((string_to_array(storage.objects.name, '/'))[1] from 'club-(.*)$')
      AND clubs.owner_id = auth.uid()
    )
  );

-- Policy 3: Club owners and team owners can manage coach photos
-- Path format: club-{clubId}/team-{teamId}/coach-{teamId}.ext
CREATE POLICY "Club and team owners can manage coach photos"
  ON storage.objects FOR ALL
  TO authenticated
  USING (
    bucket_id = 'clubs'
    AND storage.objects.name LIKE 'club-%/team-%/coach-%'
    AND EXISTS (
      SELECT 1
      FROM teams
      WHERE teams.id::text = substring(
              (string_to_array(storage.objects.name, '/'))[2]
              from 'team-(.*)'
            )
        AND (
          teams.owner_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM clubs
            WHERE clubs.id = teams.club_id
            AND clubs.owner_id = auth.uid()
          )
        )
        AND teams.club_id::text = substring((string_to_array(storage.objects.name, '/'))[1] from 'club-(.*)$')
    )
  )
  WITH CHECK (
    bucket_id = 'clubs'
    AND storage.objects.name LIKE 'club-%/team-%/coach-%'
    AND EXISTS (
      SELECT 1
      FROM teams
      WHERE teams.id::text = substring(
              (string_to_array(storage.objects.name, '/'))[2]
              from 'team-(.*)'
            )
        AND (
          teams.owner_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM clubs
            WHERE clubs.id = teams.club_id
            AND clubs.owner_id = auth.uid()
          )
        )
        AND teams.club_id::text = substring((string_to_array(storage.objects.name, '/'))[1] from 'club-(.*)$')
    )
  );

-- Policy 4: Club owners and team owners can manage player photos
-- Path format: club-{clubId}/team-{teamId}/player-{playerId}.ext
-- Note: Only verifies team ownership, NOT player existence (allows upload before player creation)
CREATE POLICY "Club and team owners can manage player photos"
  ON storage.objects FOR ALL
  TO authenticated
  USING (
    bucket_id = 'clubs'
    AND storage.objects.name LIKE 'club-%/team-%/player-%'
    AND EXISTS (
      SELECT 1
      FROM teams
      WHERE teams.id::text = substring(
              (string_to_array(storage.objects.name, '/'))[2]
              from 'team-(.*)'
            )
        AND (
          teams.owner_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM clubs
            WHERE clubs.id = teams.club_id
            AND clubs.owner_id = auth.uid()
          )
        )
        AND teams.club_id::text = substring((string_to_array(storage.objects.name, '/'))[1] from 'club-(.*)$')
    )
  )
  WITH CHECK (
    bucket_id = 'clubs'
    AND storage.objects.name LIKE 'club-%/team-%/player-%'
    AND EXISTS (
      SELECT 1
      FROM teams
      WHERE teams.id::text = substring(
              (string_to_array(storage.objects.name, '/'))[2]
              from 'team-(.*)'
            )
        AND (
          teams.owner_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM clubs
            WHERE clubs.id = teams.club_id
            AND clubs.owner_id = auth.uid()
          )
        )
        AND teams.club_id::text = substring((string_to_array(storage.objects.name, '/'))[1] from 'club-(.*)$')
    )
  );

-- ====================================
-- NOTES
-- ====================================
-- Structure du bucket 'clubs':
--
-- clubs/
--   └── club-{clubId}/
--       ├── logo-{clubId}.jpg                      (Logo du club)
--       ├── team-{teamId}/                         (Dossier équipe 1)
--       │   ├── coach-{teamId}.jpg                 (Photo du coach)
--       │   ├── player-{playerId}.jpg
--       │   └── player-{playerId}.jpg
--       └── team-{teamId}/                         (Dossier équipe 2)
--           ├── coach-{teamId}.jpg                 (Photo du coach)
--           └── player-{playerId}.jpg
--
-- Exemples de paths:
--   - Logo: club-abc123-club-uuid/logo-abc123-club-uuid.jpg
--   - Photo coach: club-abc123-club-uuid/team-def456-team-uuid/coach-def456-team-uuid.jpg
--   - Photo joueur: club-abc123-club-uuid/team-def456-team-uuid/player-xyz789-player-uuid.jpg
--
-- Policies:
--   1. SELECT: Tous les membres du club peuvent voir les fichiers
--   2. ALL (logo): Seulement le club owner peut gérer le logo
--   3. ALL (coach photos): Le club owner ET le team owner peuvent gérer les photos de coach
--   4. ALL (player photos): Le club owner ET le team owner peuvent gérer les photos des joueurs
