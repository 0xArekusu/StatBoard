-- ====================================
-- STORAGE: player-photos bucket
-- Store player photos uploaded by team owners
-- Structure: {clubId}/{playerId}.ext (NO TIMESTAMP - one photo per player)
-- ====================================

-- Create the player-photos bucket if it doesn't exist (PRIVATE)
INSERT INTO storage.buckets (id, name, public)
VALUES ('player-photos', 'player-photos', false)
ON CONFLICT (id) DO NOTHING;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Team owners can upload player photos" ON storage.objects;
DROP POLICY IF EXISTS "Team owners can view player photos" ON storage.objects;
DROP POLICY IF EXISTS "Team owners can update player photos" ON storage.objects;
DROP POLICY IF EXISTS "Team owners can delete player photos" ON storage.objects;
DROP POLICY IF EXISTS "Club members can view player photos" ON storage.objects;

-- ====================================
-- STORAGE POLICIES
-- Path format: {clubId}/{playerId}.ext (NO TIMESTAMP)
-- ====================================

-- Policy: Club members and club owners can view all photos from their club
-- Future: This allows players to see their team photos
CREATE POLICY "Club members can view player photos"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'player-photos'
    AND (
      -- Club member can view photos from their club
      is_club_member((string_to_array(storage.objects.name, '/'))[1]::uuid)
      OR
      -- Club owner can view photos from their club
      EXISTS (
        SELECT 1 FROM clubs
        WHERE clubs.id::text = (string_to_array(storage.objects.name, '/'))[1]::text
        AND clubs.owner_id = auth.uid()
      )
    )
  );

-- Policy: Team owners can upload photos for their players
-- Verifies: player belongs to team owned by user
-- Extract playerId before first dot (format: playerId.ext)
CREATE POLICY "Team owners can upload player photos"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'player-photos'
    AND EXISTS (
      SELECT 1
      FROM players
      JOIN teams ON teams.id = players.team_id
      WHERE players.id::text = substring((string_to_array(storage.objects.name, '/'))[2] from '^[^.]+')
        AND teams.owner_id = auth.uid()
        AND teams.club_id::text = (string_to_array(storage.objects.name, '/'))[1]::text
    )
  );

-- Policy: Team owners can update photos for their players
-- Used when upsert=true to replace existing photo
CREATE POLICY "Team owners can update player photos"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'player-photos'
    AND EXISTS (
      SELECT 1
      FROM players
      JOIN teams ON teams.id = players.team_id
      WHERE players.id::text = substring((string_to_array(storage.objects.name, '/'))[2] from '^[^.]+')
        AND teams.owner_id = auth.uid()
        AND teams.club_id::text = (string_to_array(storage.objects.name, '/'))[1]::text
    )
  );

-- Policy: Team owners can delete photos for their players
CREATE POLICY "Team owners can delete player photos"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'player-photos'
    AND EXISTS (
      SELECT 1
      FROM players
      JOIN teams ON teams.id = players.team_id
      WHERE players.id::text = substring((string_to_array(storage.objects.name, '/'))[2] from '^[^.]+')
        AND teams.owner_id = auth.uid()
        AND teams.club_id::text = (string_to_array(storage.objects.name, '/'))[1]::text
    )
  );
