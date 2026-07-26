-- KosanKu — Migration 021: Fix Rental Request Expiry Trigger
-- Deskripsi: Mengubah trigger set_rental_request_expiry agar tidak menimpa nilai expires_at
--            jika nilainya sudah dikirim dari aplikasi (frontend).

CREATE OR REPLACE FUNCTION set_rental_request_expiry()
RETURNS TRIGGER AS $$
BEGIN
  -- Hanya set expires_at secara default (3 hari kerja) JIKA nilainya kosong dari frontend
  IF NEW.expires_at IS NULL THEN
    NEW.expires_at := calculate_rental_request_expiry(NEW.created_at);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
