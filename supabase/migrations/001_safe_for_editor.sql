-- ============================================================
-- KosanKu — Migration 001: Initial Database Schema
-- Versi: SAFE untuk SQL Editor Supabase
-- ============================================================

-- Aktifkan ekstensi yang dibutuhkan
-- uuid-ossp sudah aktif default di Supabase
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- pg_cron & postgis akan diaktifkan manual via Dashboard → Extensions
-- Jangan error jika belum ada:
DO $$ BEGIN
  CREATE EXTENSION IF NOT EXISTS "pg_cron";
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'pg_cron belum tersedia — lewati. Aktifkan via Dashboard > Database > Extensions';
END $$;

DO $$ BEGIN
  CREATE EXTENSION IF NOT EXISTS "postgis";
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'postgis belum tersedia — lewati. Aktifkan via Dashboard > Database > Extensions';
END $$;

-- ============================================================
-- ENUM TYPES
-- ============================================================

DO $$ BEGIN
  CREATE TYPE user_role_enum AS ENUM ('owner', 'tenant');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE room_status_enum AS ENUM ('available', 'pending', 'occupied', 'maintenance');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE rental_request_status_enum AS ENUM ('pending', 'approved', 'rejected', 'expired', 'cancelled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE contract_status_enum AS ENUM ('active', 'ended', 'terminated', 'early_exit');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE invoice_status_enum AS ENUM ('unpaid', 'paid', 'overdue', 'partial', 'cancelled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE payment_status_enum AS ENUM ('pending', 'success', 'failed', 'expired', 'refunded');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE payment_method_enum AS ENUM ('bank_transfer', 'gopay', 'ovo', 'dana', 'qris', 'credit_card');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE room_type_enum AS ENUM ('standard', 'deluxe', 'suite', 'studio');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE gender_policy_enum AS ENUM ('male', 'female', 'mixed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE contract_end_reason_enum AS ENUM ('natural_expiry', 'early_exit_approved', 'terminated_by_owner');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================================
-- TABEL 1: users
-- ============================================================

CREATE TABLE IF NOT EXISTS public.users (
  id                  UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role                user_role_enum NOT NULL,
  email               TEXT,
  phone_number        TEXT,
  full_name           TEXT,
  avatar_url          TEXT,
  fcm_token           TEXT,
  is_active           BOOLEAN NOT NULL DEFAULT TRUE,
  is_profile_complete BOOLEAN NOT NULL DEFAULT FALSE,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT users_email_or_phone_required CHECK (
    email IS NOT NULL OR phone_number IS NOT NULL
  )
);

CREATE INDEX IF NOT EXISTS idx_users_role ON public.users(role);
CREATE INDEX IF NOT EXISTS idx_users_phone ON public.users(phone_number);

-- ============================================================
-- TABEL 2: owner_profiles
-- ============================================================

CREATE TABLE IF NOT EXISTS public.owner_profiles (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id             UUID NOT NULL UNIQUE REFERENCES public.users(id) ON DELETE CASCADE,
  bank_account_name   TEXT,
  bank_account_number TEXT,
  bank_name           TEXT,
  ktp_number          TEXT,
  ktp_photo_url       TEXT,
  npwp_number         TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TABEL 3: tenant_profiles
-- ============================================================

CREATE TABLE IF NOT EXISTS public.tenant_profiles (
  id                       UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id                  UUID NOT NULL UNIQUE REFERENCES public.users(id) ON DELETE CASCADE,
  occupation               TEXT,
  emergency_contact_name   TEXT,
  emergency_contact_phone  TEXT,
  gender                   TEXT,
  date_of_birth            DATE,
  ktp_number               TEXT,
  ktp_photo_url            TEXT,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TABEL 4: properties
-- ============================================================

CREATE TABLE IF NOT EXISTS public.properties (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id              UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  name                  TEXT NOT NULL,
  description           TEXT,
  address_line          TEXT NOT NULL,
  city                  TEXT NOT NULL,
  district              TEXT,
  postal_code           TEXT,
  latitude              DOUBLE PRECISION,
  longitude             DOUBLE PRECISION,
  general_facilities    TEXT[],
  gender_policy         gender_policy_enum NOT NULL DEFAULT 'mixed',
  rules                 TEXT,
  cover_photo_url       TEXT,
  photo_urls            TEXT[],
  billing_generate_day  INTEGER NOT NULL DEFAULT 1
                        CHECK (billing_generate_day BETWEEN 1 AND 28),
  billing_due_days      INTEGER NOT NULL DEFAULT 10,
  is_active             BOOLEAN NOT NULL DEFAULT FALSE,
  is_deleted            BOOLEAN NOT NULL DEFAULT FALSE,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_properties_owner_id ON public.properties(owner_id);
CREATE INDEX IF NOT EXISTS idx_properties_is_active ON public.properties(is_active);
CREATE INDEX IF NOT EXISTS idx_properties_location ON public.properties(latitude, longitude);

-- ============================================================
-- TABEL 5: rooms
-- ============================================================

CREATE TABLE IF NOT EXISTS public.rooms (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  property_id      UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  room_number      TEXT NOT NULL,
  room_type        room_type_enum NOT NULL DEFAULT 'standard',
  floor_number     INTEGER,
  size_sqm         DECIMAL(6,2),
  base_price       DECIMAL(12,2) NOT NULL,
  status           room_status_enum NOT NULL DEFAULT 'available',
  description      TEXT,
  photo_urls       TEXT[],
  is_deleted       BOOLEAN NOT NULL DEFAULT FALSE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT rooms_room_number_unique_per_property
    UNIQUE (property_id, room_number)
);

CREATE INDEX IF NOT EXISTS idx_rooms_property_id ON public.rooms(property_id);
CREATE INDEX IF NOT EXISTS idx_rooms_status ON public.rooms(status);

-- ============================================================
-- TABEL 6: facility_master
-- ============================================================

CREATE TABLE IF NOT EXISTS public.facility_master (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name         TEXT NOT NULL UNIQUE,
  icon_name    TEXT,
  category     TEXT,
  is_active    BOOLEAN NOT NULL DEFAULT TRUE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO public.facility_master (name, icon_name, category) VALUES
  ('AC', 'air-conditioner', 'electronics'),
  ('WiFi', 'wifi', 'connectivity'),
  ('Kamar Mandi Dalam', 'shower', 'bathroom'),
  ('Water Heater', 'water-heater', 'bathroom'),
  ('Kasur', 'bed', 'furniture'),
  ('Lemari', 'wardrobe', 'furniture'),
  ('Meja Belajar', 'desk', 'furniture'),
  ('Kursi', 'chair', 'furniture'),
  ('Kulkas', 'refrigerator', 'electronics'),
  ('TV', 'television', 'electronics'),
  ('Mesin Cuci', 'washing-machine', 'electronics'),
  ('Dapur Bersama', 'kitchen', 'shared'),
  ('Balkon', 'balcony', 'space'),
  ('Jendela', 'window', 'space')
ON CONFLICT (name) DO NOTHING;

-- ============================================================
-- TABEL 7: room_facilities
-- ============================================================

CREATE TABLE IF NOT EXISTS public.room_facilities (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_id         UUID NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  facility_id     UUID NOT NULL REFERENCES public.facility_master(id) ON DELETE CASCADE,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  additional_cost DECIMAL(12,2),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT room_facilities_unique UNIQUE (room_id, facility_id)
);

CREATE INDEX IF NOT EXISTS idx_room_facilities_room_id ON public.room_facilities(room_id);

-- ============================================================
-- TABEL 8: rental_requests
-- ============================================================

CREATE TABLE IF NOT EXISTS public.rental_requests (
  id                     UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_id                UUID NOT NULL REFERENCES public.rooms(id) ON DELETE RESTRICT,
  tenant_id              UUID NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  owner_id               UUID NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  status                 rental_request_status_enum NOT NULL DEFAULT 'pending',
  requested_start_date   DATE NOT NULL,
  duration_months        INTEGER NOT NULL DEFAULT 1 CHECK (duration_months > 0),
  monthly_rate           DECIMAL(12,2) NOT NULL,
  ktp_photo_url          TEXT,
  tenant_message         TEXT,
  owner_rejection_reason TEXT,
  expires_at             TIMESTAMPTZ,
  reviewed_at            TIMESTAMPTZ,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_rental_requests_one_active_per_room
  ON public.rental_requests (room_id)
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_rental_requests_tenant_id ON public.rental_requests(tenant_id);
CREATE INDEX IF NOT EXISTS idx_rental_requests_owner_id ON public.rental_requests(owner_id);
CREATE INDEX IF NOT EXISTS idx_rental_requests_status ON public.rental_requests(status);

-- ============================================================
-- TABEL 9: contracts
-- ============================================================

CREATE TABLE IF NOT EXISTS public.contracts (
  id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  rental_request_id    UUID NOT NULL UNIQUE REFERENCES public.rental_requests(id),
  room_id              UUID NOT NULL REFERENCES public.rooms(id),
  tenant_id            UUID NOT NULL REFERENCES public.users(id),
  owner_id             UUID NOT NULL REFERENCES public.users(id),
  start_date           DATE NOT NULL,
  end_date             DATE NOT NULL,
  monthly_rate         DECIMAL(12,2) NOT NULL,
  deposit_amount       DECIMAL(12,2) DEFAULT 0,
  status               contract_status_enum NOT NULL DEFAULT 'active',
  end_reason           contract_end_reason_enum,
  end_reason_note      TEXT,
  actual_end_date      DATE,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT contracts_dates_valid CHECK (end_date > start_date)
);

CREATE INDEX IF NOT EXISTS idx_contracts_room_id ON public.contracts(room_id);
CREATE INDEX IF NOT EXISTS idx_contracts_tenant_id ON public.contracts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_contracts_status ON public.contracts(status);

-- ============================================================
-- TABEL 10: invoices
-- ============================================================

CREATE TABLE IF NOT EXISTS public.invoices (
  id                              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  contract_id                     UUID NOT NULL REFERENCES public.contracts(id),
  room_id                         UUID NOT NULL REFERENCES public.rooms(id),
  tenant_id                       UUID NOT NULL REFERENCES public.users(id),
  owner_id                        UUID NOT NULL REFERENCES public.users(id),
  invoice_number                  TEXT NOT NULL UNIQUE,
  billing_period                  DATE NOT NULL,
  due_date                        DATE NOT NULL,
  total_amount                    DECIMAL(12,2) NOT NULL,
  paid_amount                     DECIMAL(12,2) NOT NULL DEFAULT 0,
  status                          invoice_status_enum NOT NULL DEFAULT 'unpaid',
  payment_gateway_order_id        TEXT,
  payment_gateway_snap_token      TEXT,
  created_at                      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_invoices_unique_per_period
  ON public.invoices (contract_id, billing_period);

CREATE INDEX IF NOT EXISTS idx_invoices_tenant_id ON public.invoices(tenant_id);
CREATE INDEX IF NOT EXISTS idx_invoices_owner_id ON public.invoices(owner_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON public.invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_due_date ON public.invoices(due_date);

-- ============================================================
-- TABEL 11: invoice_items
-- ============================================================

CREATE TABLE IF NOT EXISTS public.invoice_items (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  invoice_id   UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  description  TEXT,
  quantity     INTEGER NOT NULL DEFAULT 1,
  unit_price   DECIMAL(12,2) NOT NULL,
  total_price  DECIMAL(12,2) NOT NULL,
  is_mandatory BOOLEAN NOT NULL DEFAULT FALSE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice_id ON public.invoice_items(invoice_id);

-- ============================================================
-- TABEL 12: payments (IMMUTABLE)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.payments (
  id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  invoice_id              UUID NOT NULL REFERENCES public.invoices(id),
  tenant_id               UUID NOT NULL REFERENCES public.users(id),
  owner_id                UUID NOT NULL REFERENCES public.users(id),
  amount                  DECIMAL(12,2) NOT NULL CHECK (amount > 0),
  payment_method          payment_method_enum,
  status                  payment_status_enum NOT NULL DEFAULT 'pending',
  gateway_transaction_id  TEXT UNIQUE,
  gateway_payment_code    TEXT,
  gateway_raw_response    JSONB,
  paid_at                 TIMESTAMPTZ,
  expired_at              TIMESTAMPTZ,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payments_invoice_id ON public.payments(invoice_id);
CREATE INDEX IF NOT EXISTS idx_payments_tenant_id ON public.payments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON public.payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_created_at ON public.payments(created_at);

-- ============================================================
-- TABEL 13: favorites
-- ============================================================

CREATE TABLE IF NOT EXISTS public.favorites (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id    UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  property_id  UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT favorites_unique UNIQUE (tenant_id, property_id)
);

CREATE INDEX IF NOT EXISTS idx_favorites_tenant_id ON public.favorites(tenant_id);

-- ============================================================
-- TABEL 14: notifications
-- ============================================================

CREATE TABLE IF NOT EXISTS public.notifications (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id        UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  title          TEXT NOT NULL,
  body           TEXT NOT NULL,
  type           TEXT NOT NULL,
  reference_id   UUID,
  reference_type TEXT,
  is_read        BOOLEAN NOT NULL DEFAULT FALSE,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON public.notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at DESC);

-- ============================================================
-- TABEL 15: fcm_tokens
-- ============================================================

CREATE TABLE IF NOT EXISTS public.fcm_tokens (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  token       TEXT NOT NULL UNIQUE,
  device_id   TEXT,
  platform    TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fcm_tokens_user_id ON public.fcm_tokens(user_id);

-- ============================================================
-- TRIGGER: Auto-update updated_at
-- ============================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
DECLARE
  table_names TEXT[] := ARRAY[
    'users', 'owner_profiles', 'tenant_profiles', 'properties',
    'rooms', 'room_facilities', 'rental_requests', 'contracts',
    'invoices', 'fcm_tokens'
  ];
  t TEXT;
  trigger_name TEXT;
BEGIN
  FOREACH t IN ARRAY table_names LOOP
    trigger_name := 'trigger_update_' || t || '_updated_at';
    -- Drop dulu jika sudah ada (idempotent)
    EXECUTE format('DROP TRIGGER IF EXISTS %I ON public.%I', trigger_name, t);
    EXECUTE format(
      'CREATE TRIGGER %I
       BEFORE UPDATE ON public.%I
       FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()',
      trigger_name, t
    );
  END LOOP;
END;
$$;

-- ============================================================
-- TRIGGER: Sinkron invoice.paid_amount & status
-- ============================================================

CREATE OR REPLACE FUNCTION sync_invoice_payment_status()
RETURNS TRIGGER AS $$
DECLARE
  total_paid    DECIMAL(12,2);
  invoice_total DECIMAL(12,2);
BEGIN
  IF NEW.status = 'success' AND (OLD.status IS NULL OR OLD.status != 'success') THEN
    SELECT COALESCE(SUM(amount), 0)
    INTO total_paid
    FROM public.payments
    WHERE invoice_id = NEW.invoice_id AND status = 'success';

    total_paid := total_paid + NEW.amount;

    SELECT total_amount INTO invoice_total
    FROM public.invoices
    WHERE id = NEW.invoice_id;

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

DROP TRIGGER IF EXISTS trigger_sync_invoice_on_payment ON public.payments;
CREATE TRIGGER trigger_sync_invoice_on_payment
  AFTER INSERT OR UPDATE ON public.payments
  FOR EACH ROW EXECUTE FUNCTION sync_invoice_payment_status();

-- ============================================================
-- TRIGGER: Auto-update room status saat rental request diproses
-- ============================================================

CREATE OR REPLACE FUNCTION sync_room_status_on_rental_request()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.status = 'pending' THEN
    UPDATE public.rooms SET status = 'pending' WHERE id = NEW.room_id;
  ELSIF TG_OP = 'UPDATE' AND NEW.status = 'approved' AND OLD.status = 'pending' THEN
    UPDATE public.rooms SET status = 'occupied' WHERE id = NEW.room_id;
  ELSIF TG_OP = 'UPDATE'
    AND NEW.status IN ('rejected', 'expired', 'cancelled')
    AND OLD.status = 'pending' THEN
    UPDATE public.rooms SET status = 'available' WHERE id = NEW.room_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_sync_room_status ON public.rental_requests;
CREATE TRIGGER trigger_sync_room_status
  AFTER INSERT OR UPDATE ON public.rental_requests
  FOR EACH ROW EXECUTE FUNCTION sync_room_status_on_rental_request();

-- ============================================================
-- TRIGGER: Auto-create contract saat rental_request disetujui
-- ============================================================

CREATE OR REPLACE FUNCTION create_contract_on_rental_approval()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'approved' AND OLD.status = 'pending' THEN
    INSERT INTO public.contracts (
      rental_request_id, room_id, tenant_id, owner_id,
      start_date, end_date, monthly_rate
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
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_create_contract_on_approval ON public.rental_requests;
CREATE TRIGGER trigger_create_contract_on_approval
  AFTER UPDATE ON public.rental_requests
  FOR EACH ROW EXECUTE FUNCTION create_contract_on_rental_approval();

-- ============================================================
-- TRIGGER: Auto-update room status saat kontrak berakhir
-- ============================================================

CREATE OR REPLACE FUNCTION sync_room_status_on_contract_end()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status IN ('ended', 'terminated', 'early_exit')
     AND OLD.status = 'active' THEN
    UPDATE public.rooms SET status = 'available' WHERE id = NEW.room_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_sync_room_on_contract_end ON public.contracts;
CREATE TRIGGER trigger_sync_room_on_contract_end
  AFTER UPDATE ON public.contracts
  FOR EACH ROW EXECUTE FUNCTION sync_room_status_on_contract_end();

-- ============================================================
-- SELESAI: Migration 001
-- ============================================================
SELECT 'Migration 001 berhasil! 15 tabel + triggers siap.' AS status;
