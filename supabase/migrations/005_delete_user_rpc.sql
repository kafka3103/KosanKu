-- ============================================================
-- KosanKu — Migration 005: Add Delete User RPC
-- Supabase PostgreSQL
-- Deskripsi: Menambahkan fungsi RPC untuk menghapus user secara permanen.
--            Fungsi ini dipanggil dari aplikasi (client-side) dan akan
--            menghapus akun di tabel auth.users berdasarkan UID yang login.
--            Karena ada constraint ON DELETE CASCADE, seluruh data profil
--            di tabel public.users juga akan otomatis terhapus.
-- ============================================================

CREATE OR REPLACE FUNCTION delete_user()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER -- Wajib agar function punya akses admin ke schema auth
SET search_path = public
AS $$
BEGIN
  -- Menghapus baris user di auth.users yang sesuai dengan auth.uid() sesi saat ini
  DELETE FROM auth.users WHERE id = auth.uid();
END;
$$;
