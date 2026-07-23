-- ============================================================
-- KosanKu — Migration 018: Add Bilingual Columns
-- Supabase PostgreSQL
-- Deskripsi: Tambah kolom _en untuk field yang perlu ditranslate
-- ============================================================

-- properties
ALTER TABLE public.properties ADD COLUMN name_en TEXT;
ALTER TABLE public.properties ADD COLUMN description_en TEXT;
ALTER TABLE public.properties ADD COLUMN address_line_en TEXT;
ALTER TABLE public.properties ADD COLUMN rules_en TEXT;

-- rooms
ALTER TABLE public.rooms ADD COLUMN description_en TEXT;

-- reviews
ALTER TABLE public.reviews ADD COLUMN comment_en TEXT;
