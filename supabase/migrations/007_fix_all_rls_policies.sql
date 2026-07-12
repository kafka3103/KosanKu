-- ============================================================
-- KosanKu — Migration 007: Fix ALL RLS Policies (Notifications, Contracts, Invoices)
-- Deskripsi: Mengizinkan role 'authenticated' (Owner/Tenant) untuk melakukan
--            insert ke tabel notifications, contracts, dan invoices saat proses
--            pengajuan & persetujuan kamar berlangsung.
-- ============================================================

-- 1. Fix kebijakan RLS tabel notifications
DROP POLICY IF EXISTS "system_insert_notifications" ON public.notifications;
CREATE POLICY "system_insert_notifications"
  ON public.notifications FOR INSERT
  WITH CHECK (auth.role() IN ('authenticated', 'service_role'));

-- 2. Fix kebijakan RLS tabel contracts
DROP POLICY IF EXISTS "system_insert_contracts" ON public.contracts;
CREATE POLICY "system_insert_contracts"
  ON public.contracts FOR INSERT
  WITH CHECK (auth.role() IN ('authenticated', 'service_role'));

-- 3. Fix kebijakan RLS tabel invoices
DROP POLICY IF EXISTS "system_insert_invoices" ON public.invoices;
CREATE POLICY "system_insert_invoices"
  ON public.invoices FOR INSERT
  WITH CHECK (auth.role() IN ('authenticated', 'service_role'));

-- 4. Pastikan function trigger dijalankan dengan SECURITY DEFINER agar tidak terblokir RLS
CREATE OR REPLACE FUNCTION create_contract_on_rental_approval()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'approved' AND OLD.status = 'pending' THEN
    INSERT INTO public.contracts (
      rental_request_id,
      room_id,
      tenant_id,
      owner_id,
      start_date,
      end_date,
      monthly_rate
    ) VALUES (
      NEW.id,
      NEW.room_id,
      NEW.tenant_id,
      NEW.owner_id,
      NEW.requested_start_date,
      (NEW.requested_start_date + (NEW.duration_months || ' months')::INTERVAL)::DATE,
      NEW.monthly_rate
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
