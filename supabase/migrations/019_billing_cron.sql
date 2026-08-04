-- Enable pg_cron if not enabled (Note: in hosted supabase this is enabled by default for superuser)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Create function to check billing and generate notifications
CREATE OR REPLACE FUNCTION check_billing_status_and_notify()
RETURNS void AS $$
DECLARE
  inv RECORD;
BEGIN
  -- 1. Pengingat Tagihan (H-3)
  FOR inv IN
    SELECT i.id, i.tenant_id, i.owner_id, i.invoice_number, i.total_amount, i.paid_amount, c.room_id
    FROM public.invoices i
    JOIN public.contracts c ON i.contract_id = c.id
    WHERE i.paid_amount < i.total_amount
      AND i.due_date = CURRENT_DATE + INTERVAL '3 days'
      AND c.status = 'active'
  LOOP
    -- Notifikasi ke Tenant
    INSERT INTO public.notifications (user_id, title, body, type, reference_id)
    VALUES (
      inv.tenant_id,
      'Tagihan Hampir Jatuh Tempo',
      'Tagihan ' || inv.invoice_number || ' Anda akan jatuh tempo dalam 3 hari. Segera lunasi sisa tagihan Anda.',
      'payment',
      inv.id
    );
  END LOOP;

  -- 2. Peringatan Penunggak (> 14 hari)
  FOR inv IN
    SELECT i.id, i.tenant_id, i.owner_id, i.invoice_number, i.total_amount, i.paid_amount, c.room_id, u_tenant.full_name as tenant_name
    FROM public.invoices i
    JOIN public.contracts c ON i.contract_id = c.id
    JOIN public.users u_tenant ON i.tenant_id = u_tenant.id
    WHERE i.paid_amount < i.total_amount
      AND i.due_date = CURRENT_DATE - INTERVAL '14 days'
      AND c.status = 'active'
  LOOP
    -- Peringatan ke Tenant
    INSERT INTO public.notifications (user_id, title, body, type, reference_id)
    VALUES (
      inv.tenant_id,
      'Peringatan Tunggakan',
      'Tagihan ' || inv.invoice_number || ' Anda telah melewati jatuh tempo lebih dari 14 hari. Mohon segera selesaikan pembayaran.',
      'payment',
      inv.id
    );

    -- Peringatan ke Owner
    INSERT INTO public.notifications (user_id, title, body, type, reference_id)
    VALUES (
      inv.owner_id,
      'Peringatan Tenant Menunggak',
      'Tenant ' || inv.tenant_name || ' menunggak tagihan ' || inv.invoice_number || ' lebih dari 14 hari.',
      'system',
      inv.id
    );
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Schedule the cron job to run daily at 00:00 UTC (07:00 WIB)
SELECT cron.schedule(
  'check-billing-status-daily',
  '0 0 * * *',
  'SELECT check_billing_status_and_notify()'
);
