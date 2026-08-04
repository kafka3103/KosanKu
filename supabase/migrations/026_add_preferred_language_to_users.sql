-- ============================================================
-- KosanKu — Migration 026: Add preferred_language to users
-- Supabase PostgreSQL (Forward-Only & Non-Destructive)
-- Deskripsi: Menyimpan preferensi bahasa pengguna ('id' / 'en')
--            agar notifikasi backend & email/push menyesuaikan
-- ============================================================

ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS preferred_language TEXT DEFAULT 'id';

COMMENT ON COLUMN public.users.preferred_language IS 'Preferensi bahasa aplikasi pengguna (id = Bahasa Indonesia, en = English)';
