-- Menambahkan kolom is_verified ke tabel owner_profiles
ALTER TABLE public.owner_profiles
ADD COLUMN is_verified BOOLEAN NOT NULL DEFAULT false;

-- Menambahkan kolom is_verified ke tabel tenant_profiles
ALTER TABLE public.tenant_profiles
ADD COLUMN is_verified BOOLEAN NOT NULL DEFAULT false;

-- Menghapus kolom ktp_photo_url karena foto KTP sudah tidak diperlukan (digantikan validasi NIK)
ALTER TABLE public.owner_profiles
DROP COLUMN IF EXISTS ktp_photo_url;

ALTER TABLE public.tenant_profiles
DROP COLUMN IF EXISTS ktp_photo_url;
