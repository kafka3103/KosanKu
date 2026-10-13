-- ============================================================
-- KosanKu — Migration 030: Add Bilingual for Facility Master
-- Supabase PostgreSQL
-- Deskripsi: Tambah kolom _en untuk field nama di facility_master
-- ============================================================

ALTER TABLE public.facility_master ADD COLUMN IF NOT EXISTS name_en TEXT;
