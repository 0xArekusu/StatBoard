-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Authenticated users can upload player photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can view their own player photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own player photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own player photos" ON storage.objects;

-- Policy: Authenticated users can upload player photos
CREATE POLICY "Authenticated users can upload player photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'player-photos');

-- Policy: Users can view their own uploaded photos
CREATE POLICY "Users can view their own player photos"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'player-photos' AND auth.uid() = owner);

-- Policy: Users can update their own uploads
CREATE POLICY "Users can update their own player photos"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'player-photos' AND auth.uid() = owner);

-- Policy: Users can delete their own uploads
CREATE POLICY "Users can delete their own player photos"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'player-photos' AND auth.uid() = owner);
