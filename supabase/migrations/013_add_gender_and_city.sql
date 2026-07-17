-- ============================================================
-- KosanKu — Migration 013: Add Gender and Home City
-- Supabase PostgreSQL
-- ============================================================

-- Menambahkan kolom gender dan home_city ke tabel users
-- Ini memungkinkan baik tenant maupun owner untuk melengkapi profil mereka.

ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS gender TEXT,
ADD COLUMN IF NOT EXISTS home_city TEXT;
