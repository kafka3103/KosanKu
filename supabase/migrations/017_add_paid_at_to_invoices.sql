-- Migration: Add paid_at column to invoices table
-- Kolom ini mencatat waktu pembayaran lunas, diisi oleh webhook Xendit atau pembayaran manual.
-- Sebelumnya kolom ini tidak ada, sehingga paid_at dari webhook tidak tersimpan.

-- 1. Tambah kolom paid_at ke tabel invoices
ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ;

-- 2. Backfill: Isi paid_at dari data yang sudah ada di tabel payments
-- Mengambil paid_at terbaru dari payments yang berstatus completed/success untuk setiap invoice yang sudah paid
UPDATE public.invoices AS inv
SET paid_at = p.latest_paid_at
FROM (
  SELECT
    invoice_id,
    MAX(paid_at) AS latest_paid_at
  FROM public.payments
  WHERE status = 'success'
    AND paid_at IS NOT NULL
  GROUP BY invoice_id
) AS p
WHERE inv.id = p.invoice_id
  AND inv.status = 'paid'
  AND inv.paid_at IS NULL;

-- 3. Fallback backfill: Jika payments tidak punya paid_at, gunakan updated_at dari invoices
UPDATE public.invoices
SET paid_at = updated_at
WHERE status = 'paid'
  AND paid_at IS NULL;
