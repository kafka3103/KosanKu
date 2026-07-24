-- KosanKu — Migration 022: Repair Missing Contracts and Invoices
-- Deskripsi: Memperbaiki data pengajuan sewa yang sudah berstatus 'approved' 
-- namun kontrak dan tagihannya gagal dibuat (karena bug sebelumnya).

DO $$
BEGIN
  -- 1. Buat kontrak untuk rental_requests yang 'approved' tapi belum punya kontrak
  INSERT INTO public.contracts (
    rental_request_id,
    room_id,
    tenant_id,
    owner_id,
    start_date,
    end_date,
    monthly_rate,
    deposit_amount,
    status
  )
  SELECT 
    r.id,
    r.room_id,
    r.tenant_id,
    r.owner_id,
    r.requested_start_date,
    (r.requested_start_date + (r.duration_months || ' months')::INTERVAL)::DATE,
    r.monthly_rate,
    0,
    'active'
  FROM public.rental_requests r
  LEFT JOIN public.contracts c ON c.rental_request_id = r.id
  WHERE r.status = 'approved' AND c.id IS NULL;

  -- 2. Buat invoice pertama untuk kontrak yang belum punya invoice sama sekali
  INSERT INTO public.invoices (
    contract_id,
    room_id,
    tenant_id,
    owner_id,
    invoice_number,
    billing_period,
    due_date,
    total_amount,
    status
  )
  SELECT 
    c.id,
    c.room_id,
    c.tenant_id,
    c.owner_id,
    'INV-' || to_char(NOW(), 'YYYY-MM-') || lpad(floor(random() * 10000)::text, 4, '0'),
    DATE_TRUNC('month', c.start_date)::DATE,
    (c.start_date + INTERVAL '7 days')::DATE,
    c.monthly_rate,
    'unpaid'
  FROM public.contracts c
  LEFT JOIN public.invoices i ON i.contract_id = c.id
  WHERE i.id IS NULL;

END;
$$;
