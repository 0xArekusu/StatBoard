-- ====================================
-- STORAGE: player-photos bucket
-- Store player photos uploaded by team owners
-- ====================================

-- Create the player-photos bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('player-photos', 'player-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Team owners can upload player photos" ON storage.objects;
DROP POLICY IF EXISTS "Team owners can view player photos" ON storage.objects;
DROP POLICY IF EXISTS "Team owners can update player photos" ON storage.objects;
DROP POLICY IF EXISTS "Team owners can delete player photos" ON storage.objects;

-- ====================================
-- STORAGE POLICIES
-- ====================================

-- Policy: Team owners can upload player photos
CREATE POLICY "Team owners can upload player photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'player-photos'
  AND EXISTS (
    SELECT 1 FROM teams
    WHERE teams.owner_id = auth.uid()
  )
);

-- Policy: Team owners can view player photos from their teams
CREATE POLICY "Team owners can view player photos"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'player-photos'
  AND EXISTS (
    SELECT 1 FROM teams
    WHERE teams.owner_id = auth.uid()
  )
);

-- Policy: Team owners can update player photos from their teams
CREATE POLICY "Team owners can update player photos"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'player-photos'
  AND EXISTS (
    SELECT 1 FROM teams
    WHERE teams.owner_id = auth.uid()
  )
);

-- Policy: Team owners can delete player photos from their teams
CREATE POLICY "Team owners can delete player photos"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'player-photos'
  AND EXISTS (
    SELECT 1 FROM teams
    WHERE teams.owner_id = auth.uid()
  )
);
