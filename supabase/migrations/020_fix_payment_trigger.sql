-- KosanKu — Migration 020: Fix Payment Trigger Double Count
-- Deskripsi: Memperbaiki perhitungan total_paid yang dihitung ganda saat trigger AFTER INSERT

CREATE OR REPLACE FUNCTION sync_invoice_payment_status()
RETURNS TRIGGER AS $$
DECLARE
  total_paid DECIMAL(12,2);
  invoice_total DECIMAL(12,2);
BEGIN
  -- Hanya proses jika status payment berubah menjadi 'success'
  IF NEW.status = 'success' AND (TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND OLD.status != 'success')) THEN
    -- Hitung total yang sudah dibayar untuk invoice ini
    -- Karena ini adalah AFTER trigger, SELECT SUM sudah menyertakan NEW.amount
    SELECT COALESCE(SUM(amount), 0)
    INTO total_paid
    FROM public.payments
    WHERE invoice_id = NEW.invoice_id AND status = 'success';

    -- Ambil total invoice
    SELECT total_amount INTO invoice_total
    FROM public.invoices
    WHERE id = NEW.invoice_id;

    -- Update invoice
    UPDATE public.invoices
    SET
      paid_amount = total_paid,
      status = CASE
        WHEN total_paid >= invoice_total THEN 'paid'::invoice_status_enum
        WHEN total_paid > 0 THEN 'partial'::invoice_status_enum
        ELSE status
      END
    WHERE id = NEW.invoice_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
