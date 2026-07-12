-- ============================================================
-- KosanKu — Migration 001: Initial Database Schema
-- Supabase PostgreSQL
-- Deskripsi: Membuat semua tabel utama, enum, constraint, dan
--            index yang dibutuhkan aplikasi KosanKu
-- ============================================================

-- Aktifkan ekstensi yang dibutuhkan
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_cron";     -- Untuk scheduled jobs
CREATE EXTENSION IF NOT EXISTS "postgis";      -- Untuk pencarian berbasis koordinat/radius

-- ============================================================
-- ENUM TYPES
-- ============================================================

-- Hapus tabel users lama agar bisa di-recreate dengan struktur dan tipe data baru
DROP TABLE IF EXISTS public.users CASCADE;

DROP TYPE IF EXISTS user_role_enum CASCADE;
DROP TYPE IF EXISTS room_status_enum CASCADE;
DROP TYPE IF EXISTS rental_request_status_enum CASCADE;
DROP TYPE IF EXISTS contract_status_enum CASCADE;
DROP TYPE IF EXISTS invoice_status_enum CASCADE;
DROP TYPE IF EXISTS payment_status_enum CASCADE;
DROP TYPE IF EXISTS payment_method_enum CASCADE;
DROP TYPE IF EXISTS room_type_enum CASCADE;
DROP TYPE IF EXISTS gender_policy_enum CASCADE;
DROP TYPE IF EXISTS contract_end_reason_enum CASCADE;


CREATE TYPE user_role_enum AS ENUM ('owner', 'tenant');

CREATE TYPE room_status_enum AS ENUM (
  'available',
  'pending',        -- Ada pengajuan sewa aktif
  'occupied',       -- Sedang dihuni
  'maintenance'
);

CREATE TYPE rental_request_status_enum AS ENUM (
  'pending',
  'approved',
  'rejected',
  'expired',
  'cancelled'
);

CREATE TYPE contract_status_enum AS ENUM (
  'active',
  'ended',          -- Kontrak selesai natural
  'terminated',     -- Diakhiri Owner sepihak
  'early_exit'      -- Tenant keluar lebih awal
);

CREATE TYPE invoice_status_enum AS ENUM (
  'unpaid',
  'paid',
  'overdue',
  'partial',
  'cancelled'
);

CREATE TYPE payment_status_enum AS ENUM (
  'pending',
  'success',
  'failed',
  'expired',
  'refunded'
);

CREATE TYPE payment_method_enum AS ENUM (
  'bank_transfer',
  'gopay',
  'ovo',
  'dana',
  'qris',
  'credit_card'
);

CREATE TYPE room_type_enum AS ENUM (
  'standard',
  'deluxe',
  'suite',
  'studio'
);

CREATE TYPE gender_policy_enum AS ENUM (
  'male',
  'female',
  'mixed'
);

CREATE TYPE contract_end_reason_enum AS ENUM (
  'natural_expiry',
  'early_exit_approved',
  'terminated_by_owner'
);

-- ============================================================
-- TABEL 1: users
-- Extend auth.users Supabase — menyimpan role & metadata tambahan
-- ============================================================

CREATE TABLE IF NOT EXISTS public.users (
  id                  UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role                user_role_enum NOT NULL,
  email               TEXT,
  phone_number        TEXT,
  full_name           TEXT,
  avatar_url          TEXT,                -- Path di Supabase Storage
  fcm_token           TEXT,               -- Firebase Cloud Messaging token
  is_active           BOOLEAN NOT NULL DEFAULT TRUE,
  is_profile_complete BOOLEAN NOT NULL DEFAULT FALSE,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT users_email_or_phone_required CHECK (
    email IS NOT NULL OR phone_number IS NOT NULL
  )
);

CREATE INDEX idx_users_role ON public.users(role);
CREATE INDEX idx_users_phone ON public.users(phone_number);

-- ============================================================
-- TABEL 2: owner_profiles
-- Data tambahan khusus Owner
-- ============================================================

CREATE TABLE IF NOT EXISTS public.owner_profiles (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id          UUID NOT NULL UNIQUE REFERENCES public.users(id) ON DELETE CASCADE,
  bank_account_name  TEXT,
  bank_account_number TEXT,
  bank_name         TEXT,
  ktp_number        TEXT,
  ktp_photo_url     TEXT,           -- Path di Supabase Storage (akses terbatas)
  npwp_number       TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TABEL 3: tenant_profiles
-- Data tambahan khusus Tenant (calon/aktif penghuni)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.tenant_profiles (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id          UUID NOT NULL UNIQUE REFERENCES public.users(id) ON DELETE CASCADE,
  occupation       TEXT,            -- Pekerjaan/status (mahasiswa, karyawan, dll)
  emergency_contact_name   TEXT,
  emergency_contact_phone  TEXT,
  gender           TEXT,
  date_of_birth    DATE,
  ktp_number       TEXT,
  ktp_photo_url    TEXT,            -- Path di Supabase Storage (SANGAT terbatas)
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TABEL 4: properties
-- Data properti kosan milik Owner
-- ============================================================

CREATE TABLE IF NOT EXISTS public.properties (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id              UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  name                  TEXT NOT NULL,
  description           TEXT,
  address_line          TEXT NOT NULL,
  city                  TEXT NOT NULL,
  district              TEXT,               -- Kecamatan
  postal_code           TEXT,
  latitude              DOUBLE PRECISION,
  longitude             DOUBLE PRECISION,
  -- Fasilitas properti umum (berbeda dari fasilitas kamar individual)
  general_facilities    TEXT[],             -- Array: ['parking', 'cctv', 'security_24h', 'wifi_area', 'laundry']
  gender_policy         gender_policy_enum NOT NULL DEFAULT 'mixed',
  rules                 TEXT,               -- Peraturan kosan (teks bebas)
  cover_photo_url       TEXT,               -- Foto utama
  photo_urls            TEXT[],             -- Array foto tambahan
  billing_generate_day  INTEGER NOT NULL DEFAULT 1  -- Tanggal generate tagihan (1-28)
                        CHECK (billing_generate_day BETWEEN 1 AND 28),
  billing_due_days      INTEGER NOT NULL DEFAULT 10, -- Berapa hari setelah generate = jatuh tempo
  is_active             BOOLEAN NOT NULL DEFAULT FALSE, -- Diaktifkan setelah validasi sistem
  is_deleted            BOOLEAN NOT NULL DEFAULT FALSE, -- Soft delete
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_properties_owner_id ON public.properties(owner_id);
CREATE INDEX idx_properties_is_active ON public.properties(is_active);
CREATE INDEX idx_properties_location ON public.properties(latitude, longitude);

-- ============================================================
-- TABEL 5: rooms
-- Data kamar individual dalam sebuah properti
-- ============================================================

CREATE TABLE IF NOT EXISTS public.rooms (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  property_id      UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  room_number      TEXT NOT NULL,          -- Nomor/kode kamar (misal: "A1", "101")
  room_type        room_type_enum NOT NULL DEFAULT 'standard',
  floor_number     INTEGER,
  size_sqm         DECIMAL(6,2),           -- Luas dalam meter persegi
  base_price       DECIMAL(12,2) NOT NULL, -- Harga sewa dasar per bulan
  status           room_status_enum NOT NULL DEFAULT 'available',
  description      TEXT,
  photo_urls       TEXT[],                 -- Array foto kamar
  is_deleted       BOOLEAN NOT NULL DEFAULT FALSE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT rooms_room_number_unique_per_property
    UNIQUE (property_id, room_number)
);

CREATE INDEX idx_rooms_property_id ON public.rooms(property_id);
CREATE INDEX idx_rooms_status ON public.rooms(status);

-- ============================================================
-- TABEL 6: facility_master
-- Master data fasilitas yang bisa ditambahkan ke kamar
-- ============================================================

CREATE TABLE IF NOT EXISTS public.facility_master (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name         TEXT NOT NULL UNIQUE,       -- Nama fasilitas (misal: 'AC', 'WiFi')
  icon_name    TEXT,                        -- Nama ikon (misal: 'air-conditioner')
  category     TEXT,                        -- Kategori: 'electronics', 'furniture', 'bathroom', 'connectivity'
  is_active    BOOLEAN NOT NULL DEFAULT TRUE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed fasilitas master langsung di sini
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
  ('Jendela', 'window', 'space');

-- ============================================================
-- TABEL 7: room_facilities
-- Relasi kamar ↔ fasilitas (PROBIS-02, RB-13)
-- Fasilitas per kamar INDEPENDEN — tidak diwariskan dari properti
-- ============================================================

CREATE TABLE IF NOT EXISTS public.room_facilities (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_id             UUID NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  facility_id         UUID NOT NULL REFERENCES public.facility_master(id) ON DELETE CASCADE,
  is_active           BOOLEAN NOT NULL DEFAULT TRUE,
  -- Biaya tambahan opsional (null = tidak ada biaya tambahan)
  additional_cost     DECIMAL(12,2),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Satu fasilitas hanya bisa muncul sekali per kamar
  CONSTRAINT room_facilities_unique UNIQUE (room_id, facility_id)
);

CREATE INDEX idx_room_facilities_room_id ON public.room_facilities(room_id);

-- ============================================================
-- TABEL 8: rental_requests
-- Pengajuan sewa dari Tenant ke Owner
-- ============================================================

CREATE TABLE IF NOT EXISTS public.rental_requests (
  id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_id              UUID NOT NULL REFERENCES public.rooms(id) ON DELETE RESTRICT,
  tenant_id            UUID NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  owner_id             UUID NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  status               rental_request_status_enum NOT NULL DEFAULT 'pending',
  requested_start_date DATE NOT NULL,
  duration_months      INTEGER NOT NULL DEFAULT 1 CHECK (duration_months > 0),
  monthly_rate         DECIMAL(12,2) NOT NULL,  -- Snapshot harga saat pengajuan
  ktp_photo_url        TEXT,             -- Path KTP di Storage (akses sangat terbatas)
  tenant_message       TEXT,             -- Pesan dari Tenant ke Owner
  owner_rejection_reason TEXT,           -- Alasan penolakan (jika status = rejected)
  expires_at           TIMESTAMPTZ,      -- Auto-expire timestamp (3 hari kerja)
  reviewed_at          TIMESTAMPTZ,      -- Waktu Owner mereview
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- CONSTRAINT KRITIS (RB): Satu kamar hanya boleh punya SATU pengajuan aktif
-- Partial unique index — hanya berlaku saat status = 'pending'
CREATE UNIQUE INDEX idx_rental_requests_one_active_per_room
  ON public.rental_requests (room_id)
  WHERE status = 'pending';

CREATE INDEX idx_rental_requests_tenant_id ON public.rental_requests(tenant_id);
CREATE INDEX idx_rental_requests_owner_id ON public.rental_requests(owner_id);
CREATE INDEX idx_rental_requests_status ON public.rental_requests(status);

-- ============================================================
-- TABEL 9: contracts
-- Kontrak hunian aktif antara Owner dan Tenant
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
  actual_end_date      DATE,    -- Tanggal selesai aktual (bisa berbeda dari end_date)
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT contracts_dates_valid CHECK (end_date > start_date)
);

CREATE INDEX idx_contracts_room_id ON public.contracts(room_id);
CREATE INDEX idx_contracts_tenant_id ON public.contracts(tenant_id);
CREATE INDEX idx_contracts_status ON public.contracts(status);

-- ============================================================
-- TABEL 10: invoices
-- Tagihan bulanan per penghuni aktif
-- ============================================================

CREATE TABLE IF NOT EXISTS public.invoices (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  contract_id       UUID NOT NULL REFERENCES public.contracts(id),
  room_id           UUID NOT NULL REFERENCES public.rooms(id),
  tenant_id         UUID NOT NULL REFERENCES public.users(id),
  owner_id          UUID NOT NULL REFERENCES public.users(id),
  invoice_number    TEXT NOT NULL UNIQUE, -- Format: INV-YYYY-MM-{sequence}
  billing_period    DATE NOT NULL,         -- Tanggal awal periode tagihan (YYYY-MM-01)
  due_date          DATE NOT NULL,
  total_amount      DECIMAL(12,2) NOT NULL,
  paid_amount       DECIMAL(12,2) NOT NULL DEFAULT 0,
  status            invoice_status_enum NOT NULL DEFAULT 'unpaid',
  -- Payment gateway data
  payment_gateway_order_id    TEXT,
  payment_gateway_snap_token  TEXT,       -- Midtrans Snap token
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Satu kontrak hanya boleh punya satu tagihan per periode
CREATE UNIQUE INDEX idx_invoices_unique_per_period
  ON public.invoices (contract_id, billing_period);

CREATE INDEX idx_invoices_tenant_id ON public.invoices(tenant_id);
CREATE INDEX idx_invoices_owner_id ON public.invoices(owner_id);
CREATE INDEX idx_invoices_status ON public.invoices(status);
CREATE INDEX idx_invoices_due_date ON public.invoices(due_date);

-- ============================================================
-- TABEL 11: invoice_items
-- Item-item dalam tagihan (sewa, listrik, air, kebersihan, dll)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.invoice_items (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  invoice_id   UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,           -- Nama item (misal: "Sewa Kamar", "Listrik")
  description  TEXT,
  quantity     INTEGER NOT NULL DEFAULT 1,
  unit_price   DECIMAL(12,2) NOT NULL,
  total_price  DECIMAL(12,2) NOT NULL,  -- quantity × unit_price
  is_mandatory BOOLEAN NOT NULL DEFAULT FALSE, -- Mandatory (sewa) vs opsional
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_invoice_items_invoice_id ON public.invoice_items(invoice_id);

-- ============================================================
-- TABEL 12: payments
-- Riwayat pembayaran (IMMUTABLE / append-only — tidak boleh diubah/hapus)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.payments (
  id                        UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  invoice_id                UUID NOT NULL REFERENCES public.invoices(id),
  tenant_id                 UUID NOT NULL REFERENCES public.users(id),
  owner_id                  UUID NOT NULL REFERENCES public.users(id),
  amount                    DECIMAL(12,2) NOT NULL CHECK (amount > 0),
  payment_method            payment_method_enum,
  status                    payment_status_enum NOT NULL DEFAULT 'pending',
  -- Data dari payment gateway
  gateway_transaction_id    TEXT UNIQUE,  -- ID transaksi dari Midtrans/Xendit
  gateway_payment_code      TEXT,         -- Kode pembayaran (VA number, QRIS, dll)
  gateway_raw_response      JSONB,        -- Raw response dari gateway (untuk audit)
  paid_at                   TIMESTAMPTZ,
  expired_at                TIMESTAMPTZ,
  created_at                TIMESTAMPTZ NOT NULL DEFAULT NOW()
  -- Tidak ada updated_at — record ini immutable setelah INSERT
);

-- RLS akan mencegah UPDATE dan DELETE pada tabel ini
CREATE INDEX idx_payments_invoice_id ON public.payments(invoice_id);
CREATE INDEX idx_payments_tenant_id ON public.payments(tenant_id);
CREATE INDEX idx_payments_status ON public.payments(status);
CREATE INDEX idx_payments_created_at ON public.payments(created_at);

-- ============================================================
-- TABEL 13: favorites
-- Properti favorit yang disimpan Tenant
-- ============================================================

CREATE TABLE IF NOT EXISTS public.favorites (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id    UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  property_id  UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT favorites_unique UNIQUE (tenant_id, property_id)
);

CREATE INDEX idx_favorites_tenant_id ON public.favorites(tenant_id);

-- ============================================================
-- TABEL 14: notifications
-- Log notifikasi in-app per user
-- ============================================================

CREATE TABLE IF NOT EXISTS public.notifications (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  title         TEXT NOT NULL,
  body          TEXT NOT NULL,
  type          TEXT NOT NULL,    -- 'rental_request', 'invoice_generated', 'payment_received', dll
  reference_id  UUID,             -- ID entitas terkait (invoice_id, rental_request_id, dll)
  reference_type TEXT,            -- Tipe entitas: 'invoice', 'rental_request', 'contract'
  is_read       BOOLEAN NOT NULL DEFAULT FALSE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX idx_notifications_is_read ON public.notifications(user_id, is_read);
CREATE INDEX idx_notifications_created_at ON public.notifications(created_at DESC);

-- ============================================================
-- TABEL 15: fcm_tokens
-- Firebase Cloud Messaging token per perangkat user
-- ============================================================

CREATE TABLE IF NOT EXISTS public.fcm_tokens (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  token       TEXT NOT NULL UNIQUE,
  device_id   TEXT,
  platform    TEXT,     -- 'android', 'ios'
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_fcm_tokens_user_id ON public.fcm_tokens(user_id);

-- ============================================================
-- TRIGGERS: Auto-update updated_at
-- ============================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Terapkan trigger ke semua tabel yang punya updated_at
DO $$
DECLARE
  table_names TEXT[] := ARRAY[
    'users', 'owner_profiles', 'tenant_profiles', 'properties',
    'rooms', 'room_facilities', 'rental_requests', 'contracts',
    'invoices', 'fcm_tokens'
  ];
  t TEXT;
BEGIN
  FOREACH t IN ARRAY table_names LOOP
    EXECUTE format(
      'CREATE TRIGGER trigger_update_%I_updated_at
       BEFORE UPDATE ON public.%I
       FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()',
      t, t
    );
  END LOOP;
END;
$$;

-- ============================================================
-- TRIGGER: Sinkron invoice.paid_amount & status saat payment berhasil
-- ============================================================

CREATE OR REPLACE FUNCTION sync_invoice_payment_status()
RETURNS TRIGGER AS $$
DECLARE
  total_paid DECIMAL(12,2);
  invoice_total DECIMAL(12,2);
BEGIN
  -- Hanya proses jika status payment berubah menjadi 'success'
  IF NEW.status = 'success' AND (OLD.status IS NULL OR OLD.status != 'success') THEN
    -- Hitung total yang sudah dibayar untuk invoice ini
    SELECT COALESCE(SUM(amount), 0)
    INTO total_paid
    FROM public.payments
    WHERE invoice_id = NEW.invoice_id AND status = 'success';

    -- Tambahkan payment yang baru saja success
    total_paid := total_paid + NEW.amount;

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

CREATE TRIGGER trigger_sync_invoice_on_payment
  AFTER INSERT OR UPDATE ON public.payments
  FOR EACH ROW EXECUTE FUNCTION sync_invoice_payment_status();

-- ============================================================
-- TRIGGER: Auto-update room status saat rental request diproses
-- ============================================================

CREATE OR REPLACE FUNCTION sync_room_status_on_rental_request()
RETURNS TRIGGER AS $$
BEGIN
  -- Pengajuan baru masuk → kamar jadi pending
  IF TG_OP = 'INSERT' AND NEW.status = 'pending' THEN
    UPDATE public.rooms SET status = 'pending' WHERE id = NEW.room_id;

  -- Pengajuan disetujui → kamar jadi occupied
  ELSIF TG_OP = 'UPDATE' AND NEW.status = 'approved' AND OLD.status = 'pending' THEN
    UPDATE public.rooms SET status = 'occupied' WHERE id = NEW.room_id;

  -- Pengajuan ditolak/expire/cancel → kamar kembali available
  ELSIF TG_OP = 'UPDATE'
    AND NEW.status IN ('rejected', 'expired', 'cancelled')
    AND OLD.status = 'pending' THEN
    UPDATE public.rooms SET status = 'available' WHERE id = NEW.room_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

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

CREATE TRIGGER trigger_sync_room_on_contract_end
  AFTER UPDATE ON public.contracts
  FOR EACH ROW EXECUTE FUNCTION sync_room_status_on_contract_end();
