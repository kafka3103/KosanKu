-- ============================================================
-- KosanKu — Migration 019: Add More Bilingual Columns
-- Supabase PostgreSQL
-- Deskripsi: Tambah kolom _en untuk field yang perlu ditranslate (semua user input)
-- ============================================================

-- tenant_profiles
ALTER TABLE public.tenant_profiles ADD COLUMN occupation_en TEXT;

-- rental_requests
ALTER TABLE public.rental_requests ADD COLUMN tenant_message_en TEXT;
ALTER TABLE public.rental_requests ADD COLUMN owner_rejection_reason_en TEXT;

-- contracts
ALTER TABLE public.contracts ADD COLUMN end_reason_note_en TEXT;

-- invoice_items
ALTER TABLE public.invoice_items ADD COLUMN name_en TEXT;
ALTER TABLE public.invoice_items ADD COLUMN description_en TEXT;
