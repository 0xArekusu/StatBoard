-- Supprimer toutes les policies existantes pour player-photos
DROP POLICY IF EXISTS "Authenticated users can upload player photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can view their own player photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own player photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own player photos" ON storage.objects;

-- Supprimer le bucket s'il existe
DELETE FROM storage.buckets WHERE id = 'player-photos';

-- Recréer le bucket en PUBLIC
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'player-photos',
  'player-photos',
  true, -- Bucket public
  5242880, -- 5MB max
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
);

-- Policies pour bucket public : tout le monde peut lire, seuls les authenticated peuvent écrire
CREATE POLICY "Public can view player photos"
ON storage.objects FOR SELECT
USING (bucket_id = 'player-photos');

CREATE POLICY "Authenticated users can upload player photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'player-photos');

CREATE POLICY "Authenticated users can update player photos"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'player-photos');

CREATE POLICY "Authenticated users can delete player photos"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'player-photos');
