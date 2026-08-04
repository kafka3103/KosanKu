-- 1. Ubah default value menjadi 'active'
ALTER TABLE public.contracts 
ALTER COLUMN status SET DEFAULT 'active'::contract_status_enum;

-- 2. Perbarui Trigger Function untuk menyertakan status 'active'
CREATE OR REPLACE FUNCTION public.create_contract_on_rental_approval()
RETURNS trigger AS $$
BEGIN
  IF NEW.status = 'approved' AND OLD.status = 'pending' THEN
    INSERT INTO public.contracts (
      rental_request_id,
      room_id,
      tenant_id,
      owner_id,
      start_date,
      end_date,
      monthly_rate,
      status
    ) VALUES (
      NEW.id,
      NEW.room_id,
      NEW.tenant_id,
      NEW.owner_id,
      NEW.requested_start_date,
      (NEW.requested_start_date + (NEW.duration_months || ' months')::INTERVAL)::DATE,
      NEW.monthly_rate,
      'active'
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
