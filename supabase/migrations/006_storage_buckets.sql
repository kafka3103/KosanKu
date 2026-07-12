-- Buat bucket untuk foto properti
INSERT INTO storage.buckets (id, name, public)
VALUES ('property-photos', 'property-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Buat bucket untuk foto kamar
INSERT INTO storage.buckets (id, name, public)
VALUES ('room-photos', 'room-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Policy untuk property-photos
CREATE POLICY "Semua orang bisa melihat foto properti"
ON storage.objects FOR SELECT
USING ( bucket_id = 'property-photos' );

CREATE POLICY "User login bisa upload foto properti"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK ( bucket_id = 'property-photos' );

CREATE POLICY "User login bisa update foto properti"
ON storage.objects FOR UPDATE
TO authenticated
USING ( bucket_id = 'property-photos' );

-- Policy untuk room-photos
CREATE POLICY "Semua orang bisa melihat foto kamar"
ON storage.objects FOR SELECT
USING ( bucket_id = 'room-photos' );

CREATE POLICY "User login bisa upload foto kamar"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK ( bucket_id = 'room-photos' );

CREATE POLICY "User login bisa update foto kamar"
ON storage.objects FOR UPDATE
TO authenticated
USING ( bucket_id = 'room-photos' );
