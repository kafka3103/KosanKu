-- ============================================================
-- KosanKu — Migration 005: Fix Notifications RLS Policy
-- Deskripsi: Mengizinkan role 'authenticated' untuk melakukan insert
--            ke tabel notifications agar trigger dari client-side app berfungsi.
-- ============================================================

DROP POLICY IF EXISTS "system_insert_notifications" ON public.notifications;

CREATE POLICY "system_insert_notifications"
  ON public.notifications FOR INSERT
  WITH CHECK (auth.role() IN ('authenticated', 'service_role'));
