-- Buat bucket untuk foto profil (avatar)
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Buat bucket untuk dokumen KTP (private)
INSERT INTO storage.buckets (id, name, public)
VALUES ('ktp-documents', 'ktp-documents', false)
ON CONFLICT (id) DO NOTHING;

-- Policy untuk avatars (PUBLIC)
CREATE POLICY "Semua orang bisa melihat avatar"
ON storage.objects FOR SELECT
USING ( bucket_id = 'avatars' );

CREATE POLICY "User login bisa upload avatar"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK ( bucket_id = 'avatars' );

CREATE POLICY "User login bisa update avatar"
ON storage.objects FOR UPDATE
TO authenticated
USING ( bucket_id = 'avatars' );

-- Policy untuk ktp-documents (PRIVATE)
CREATE POLICY "User login bisa melihat KTP"
ON storage.objects FOR SELECT
TO authenticated
USING ( bucket_id = 'ktp-documents' );

CREATE POLICY "User login bisa upload KTP"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK ( bucket_id = 'ktp-documents' );

CREATE POLICY "User login bisa update KTP"
ON storage.objects FOR UPDATE
TO authenticated
USING ( bucket_id = 'ktp-documents' );
