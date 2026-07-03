-- ============================================================
-- KosanKu — Migration 003: Functions (SAFE for SQL Editor)
-- Catatan: pg_cron jobs di bagian bawah — jalankan TERPISAH
--          hanya setelah pg_cron diaktifkan via Extensions
-- ============================================================

-- ============================================================
-- FUNCTION: Generate nomor invoice otomatis
-- ============================================================
CREATE OR REPLACE FUNCTION generate_invoice_number(billing_date DATE)
RETURNS TEXT AS $$
DECLARE
  year_month      TEXT;
  sequence_number INTEGER;
  invoice_number  TEXT;
BEGIN
  year_month := TO_CHAR(billing_date, 'YYYY-MM');

  SELECT COUNT(*) + 1
  INTO sequence_number
  FROM public.invoices
  WHERE TO_CHAR(billing_period, 'YYYY-MM') = year_month;

  invoice_number := 'INV-' || year_month || '-' || LPAD(sequence_number::TEXT, 4, '0');

  RETURN invoice_number;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- FUNCTION: Generate tagihan bulanan untuk properti
-- ============================================================
CREATE OR REPLACE FUNCTION generate_monthly_billing_for_property(target_property_id UUID)
RETURNS INTEGER AS $$
DECLARE
  billing_config         RECORD;
  active_contract        RECORD;
  current_billing_period DATE;
  new_invoice_id         UUID;
  invoices_created       INTEGER := 0;
BEGIN
  SELECT billing_generate_day, billing_due_days
  INTO billing_config
  FROM public.properties
  WHERE id = target_property_id AND is_active = TRUE AND is_deleted = FALSE;

  IF NOT FOUND THEN
    RETURN 0;
  END IF;

  current_billing_period := DATE_TRUNC('month', CURRENT_DATE);

  FOR active_contract IN
    SELECT c.id, c.room_id, c.tenant_id, c.owner_id, c.monthly_rate
    FROM public.contracts c
    JOIN public.rooms r ON r.id = c.room_id
    WHERE r.property_id = target_property_id
      AND c.status = 'active'
      AND c.start_date <= CURRENT_DATE
      AND c.end_date >= CURRENT_DATE
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM public.invoices
      WHERE contract_id = active_contract.id
        AND billing_period = current_billing_period
    ) THEN
      INSERT INTO public.invoices (
        contract_id, room_id, tenant_id, owner_id,
        invoice_number, billing_period, due_date, total_amount, status
      ) VALUES (
        active_contract.id,
        active_contract.room_id,
        active_contract.tenant_id,
        active_contract.owner_id,
        generate_invoice_number(current_billing_period),
        current_billing_period,
        current_billing_period + billing_config.billing_due_days,
        active_contract.monthly_rate,
        'unpaid'
      )
      RETURNING id INTO new_invoice_id;

      INSERT INTO public.invoice_items (
        invoice_id, name, quantity, unit_price, total_price, is_mandatory
      ) VALUES (
        new_invoice_id, 'Sewa Kamar', 1,
        active_contract.monthly_rate, active_contract.monthly_rate, TRUE
      );

      invoices_created := invoices_created + 1;
    END IF;
  END LOOP;

  RETURN invoices_created;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- FUNCTION: Expire rental requests kadaluarsa
-- ============================================================
CREATE OR REPLACE FUNCTION expire_overdue_rental_requests()
RETURNS INTEGER AS $$
DECLARE
  expired_count INTEGER;
BEGIN
  UPDATE public.rental_requests
  SET status = 'expired', updated_at = NOW()
  WHERE status = 'pending'
    AND expires_at IS NOT NULL
    AND expires_at < NOW();

  GET DIAGNOSTICS expired_count = ROW_COUNT;
  RETURN expired_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- FUNCTION: Hitung 3 hari kerja dari tanggal mulai
-- ============================================================
CREATE OR REPLACE FUNCTION calculate_rental_request_expiry(start_time TIMESTAMPTZ)
RETURNS TIMESTAMPTZ AS $$
DECLARE
  result_time       TIMESTAMPTZ;
  working_days_added INTEGER := 0;
BEGIN
  result_time := start_time;

  WHILE working_days_added < 3 LOOP
    result_time := result_time + INTERVAL '1 day';
    IF EXTRACT(DOW FROM result_time) NOT IN (0, 6) THEN
      working_days_added := working_days_added + 1;
    END IF;
  END LOOP;

  RETURN DATE_TRUNC('day', result_time) + INTERVAL '23 hours 59 minutes 59 seconds';
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- TRIGGER: Auto-set expires_at saat rental_request dibuat
-- ============================================================
CREATE OR REPLACE FUNCTION set_rental_request_expiry()
RETURNS TRIGGER AS $$
BEGIN
  NEW.expires_at := calculate_rental_request_expiry(NEW.created_at);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_set_rental_request_expiry ON public.rental_requests;
CREATE TRIGGER trigger_set_rental_request_expiry
  BEFORE INSERT ON public.rental_requests
  FOR EACH ROW EXECUTE FUNCTION set_rental_request_expiry();

-- ============================================================
-- FUNCTION: Summary keuangan Owner
-- ============================================================
CREATE OR REPLACE FUNCTION get_financial_summary(
  target_owner_id    UUID,
  target_property_id UUID DEFAULT NULL,
  start_date         DATE DEFAULT DATE_TRUNC('month', CURRENT_DATE)::DATE,
  end_date           DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE (
  total_revenue    DECIMAL(12,2),
  total_invoiced   DECIMAL(12,2),
  total_unpaid     DECIMAL(12,2),
  total_overdue    DECIMAL(12,2),
  occupancy_rate   DECIMAL(5,2),
  active_contracts INTEGER,
  total_rooms      INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COALESCE(SUM(CASE WHEN p.status = 'success'
      AND p.paid_at BETWEEN start_date AND end_date
      THEN p.amount ELSE 0 END), 0) AS total_revenue,
    COALESCE(SUM(CASE WHEN i.billing_period BETWEEN start_date AND end_date
      THEN i.total_amount ELSE 0 END), 0) AS total_invoiced,
    COALESCE(SUM(CASE WHEN i.status IN ('unpaid', 'partial')
      THEN i.total_amount - i.paid_amount ELSE 0 END), 0) AS total_unpaid,
    COALESCE(SUM(CASE WHEN i.status = 'overdue'
      THEN i.total_amount - i.paid_amount ELSE 0 END), 0) AS total_overdue,
    CASE WHEN COUNT(DISTINCT r.id) > 0
      THEN (COUNT(DISTINCT CASE WHEN r.status = 'occupied' THEN r.id END)::DECIMAL /
            COUNT(DISTINCT r.id)::DECIMAL * 100)
      ELSE 0 END AS occupancy_rate,
    COUNT(DISTINCT CASE WHEN c.status = 'active' THEN c.id END)::INTEGER AS active_contracts,
    COUNT(DISTINCT r.id)::INTEGER AS total_rooms
  FROM public.properties prop
  JOIN public.rooms r ON r.property_id = prop.id AND r.is_deleted = FALSE
  LEFT JOIN public.contracts c ON c.room_id = r.id
  LEFT JOIN public.invoices i ON i.contract_id = c.id
  LEFT JOIN public.payments p ON p.invoice_id = i.id
  WHERE prop.owner_id = target_owner_id
    AND prop.is_deleted = FALSE
    AND (target_property_id IS NULL OR prop.id = target_property_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- FUNCTION: Auto-end kontrak kadaluarsa
-- ============================================================
CREATE OR REPLACE FUNCTION auto_end_expired_contracts()
RETURNS INTEGER AS $$
DECLARE
  ended_count INTEGER;
BEGIN
  UPDATE public.contracts
  SET status = 'ended', end_reason = 'natural_expiry',
      actual_end_date = end_date, updated_at = NOW()
  WHERE status = 'active' AND end_date < CURRENT_DATE;

  GET DIAGNOSTICS ended_count = ROW_COUNT;
  RETURN ended_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- FUNCTION: Tandai invoice overdue
-- ============================================================
CREATE OR REPLACE FUNCTION mark_overdue_invoices()
RETURNS INTEGER AS $$
DECLARE
  overdue_count INTEGER;
BEGIN
  UPDATE public.invoices
  SET status = 'overdue', updated_at = NOW()
  WHERE status = 'unpaid' AND due_date < CURRENT_DATE;

  GET DIAGNOSTICS overdue_count = ROW_COUNT;
  RETURN overdue_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- SELESAI: Migration 003 (Functions)
-- ============================================================
SELECT 'Migration 003 berhasil! 6 functions + 1 trigger siap.' AS status;

-- ============================================================
-- OPSIONAL — pg_cron Jobs
-- Jalankan BAGIAN INI TERPISAH setelah aktifkan Extensions:
-- Dashboard > Database > Extensions > cari "pg_cron" > Enable
-- ============================================================
/*
SELECT cron.schedule(
  'expire-rental-requests-hourly', '0 * * * *',
  $$ SELECT expire_overdue_rental_requests(); $$
);
SELECT cron.schedule(
  'mark-overdue-invoices-daily', '0 0 * * *',
  $$ SELECT mark_overdue_invoices(); $$
);
SELECT cron.schedule(
  'auto-end-expired-contracts-daily', '5 0 * * *',
  $$ SELECT auto_end_expired_contracts(); $$
);
*/
