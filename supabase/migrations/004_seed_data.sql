-- ============================================================
-- KosanKu — Migration 004: Seed Data untuk Testing & Demo
-- Supabase PostgreSQL
-- Deskripsi: Data dummy lengkap untuk testing semua fitur
--            PENTING: Jalankan SETELAH membuat user di Supabase Auth Dashboard
--            lalu ganti UUID di bawah dengan UUID user yang dibuat
-- ============================================================

-- ============================================================
-- CATATAN PENTING:
-- Sebelum menjalankan seed ini, buat user di Supabase Auth:
--
-- Owner 1: budi.santoso@email.com / Password123! (role: owner)
-- Owner 2: siti.rahayu@email.com / Password123! (role: owner)
-- Tenant 1: andi.wijaya@email.com / Password123! (role: tenant)
-- Tenant 2: dewi.kusuma@email.com / Password123! (role: tenant)
-- Tenant 3: rizki.pratama@email.com / Password123! (role: tenant)
--
-- Setelah membuat user, copy UUID mereka ke variabel di bawah
-- ============================================================

DO $$
DECLARE
  -- ── Ganti UUID ini setelah membuat user di Supabase Auth ──
  owner1_id UUID := '00000000-0000-0000-0000-000000000001';
  owner2_id UUID := '00000000-0000-0000-0000-000000000002';
  tenant1_id UUID := '00000000-0000-0000-0000-000000000003';
  tenant2_id UUID := '00000000-0000-0000-0000-000000000004';
  tenant3_id UUID := '00000000-0000-0000-0000-000000000005';

  -- Property IDs
  property1_id UUID := uuid_generate_v4();
  property2_id UUID := uuid_generate_v4();
  property3_id UUID := uuid_generate_v4();

  -- Room IDs (Properti 1 — 6 kamar)
  room_p1_a1 UUID := uuid_generate_v4();
  room_p1_a2 UUID := uuid_generate_v4();
  room_p1_b1 UUID := uuid_generate_v4();
  room_p1_b2 UUID := uuid_generate_v4();
  room_p1_c1 UUID := uuid_generate_v4();
  room_p1_c2 UUID := uuid_generate_v4();

  -- Room IDs (Properti 2 — 4 kamar)
  room_p2_101 UUID := uuid_generate_v4();
  room_p2_102 UUID := uuid_generate_v4();
  room_p2_201 UUID := uuid_generate_v4();
  room_p2_202 UUID := uuid_generate_v4();

  -- Room IDs (Properti 3 — 3 kamar)
  room_p3_s1 UUID := uuid_generate_v4();
  room_p3_s2 UUID := uuid_generate_v4();
  room_p3_s3 UUID := uuid_generate_v4();

  -- Facility IDs (dari facility_master yang sudah di-seed di migration 001)
  fac_ac UUID;
  fac_wifi UUID;
  fac_bathroom_in UUID;
  fac_water_heater UUID;
  fac_bed UUID;
  fac_wardrobe UUID;
  fac_desk UUID;
  fac_fridge UUID;
  fac_tv UUID;

  -- Contract & Invoice IDs
  contract1_id UUID := uuid_generate_v4();
  contract2_id UUID := uuid_generate_v4();
  invoice1_id UUID := uuid_generate_v4();
  invoice2_id UUID := uuid_generate_v4();
  invoice3_id UUID := uuid_generate_v4();

BEGIN

  -- Ambil facility IDs dari master
  SELECT id INTO fac_ac FROM public.facility_master WHERE name = 'AC';
  SELECT id INTO fac_wifi FROM public.facility_master WHERE name = 'WiFi';
  SELECT id INTO fac_bathroom_in FROM public.facility_master WHERE name = 'Kamar Mandi Dalam';
  SELECT id INTO fac_water_heater FROM public.facility_master WHERE name = 'Water Heater';
  SELECT id INTO fac_bed FROM public.facility_master WHERE name = 'Kasur';
  SELECT id INTO fac_wardrobe FROM public.facility_master WHERE name = 'Lemari';
  SELECT id INTO fac_desk FROM public.facility_master WHERE name = 'Meja Belajar';
  SELECT id INTO fac_fridge FROM public.facility_master WHERE name = 'Kulkas';
  SELECT id INTO fac_tv FROM public.facility_master WHERE name = 'TV';

  -- ──────────────────────────────────────────────────────────
  -- USERS (public.users — extend auth.users)
  -- ──────────────────────────────────────────────────────────

  INSERT INTO public.users (id, role, email, full_name, is_active, is_profile_complete) VALUES
    (owner1_id, 'owner', 'budi.santoso@email.com', 'Budi Santoso', TRUE, TRUE),
    (owner2_id, 'owner', 'siti.rahayu@email.com', 'Siti Rahayu', TRUE, TRUE),
    (tenant1_id, 'tenant', 'andi.wijaya@email.com', 'Andi Wijaya', TRUE, TRUE),
    (tenant2_id, 'tenant', 'dewi.kusuma@email.com', 'Dewi Kusuma', TRUE, TRUE),
    (tenant3_id, 'tenant', 'rizki.pratama@email.com', 'Rizki Pratama', TRUE, TRUE)
  ON CONFLICT (id) DO NOTHING;

  -- OWNER PROFILES
  INSERT INTO public.owner_profiles (user_id, bank_account_name, bank_account_number, bank_name) VALUES
    (owner1_id, 'Budi Santoso', '1234567890', 'BCA'),
    (owner2_id, 'Siti Rahayu', '0987654321', 'Mandiri')
  ON CONFLICT (user_id) DO NOTHING;

  -- TENANT PROFILES
  INSERT INTO public.tenant_profiles (user_id, occupation, gender) VALUES
    (tenant1_id, 'Mahasiswa', 'male'),
    (tenant2_id, 'Karyawan Swasta', 'female'),
    (tenant3_id, 'Mahasiswa', 'male')
  ON CONFLICT (user_id) DO NOTHING;

  -- ──────────────────────────────────────────────────────────
  -- PROPERTIES
  -- ──────────────────────────────────────────────────────────

  INSERT INTO public.properties (
    id, owner_id, name, description, address_line, city, district,
    latitude, longitude, general_facilities, gender_policy,
    rules, billing_generate_day, billing_due_days, is_active
  ) VALUES
  (
    property1_id, owner1_id,
    'Kos Budi Putra Sejahtera',
    'Kosan nyaman dekat kampus, cocok untuk mahasiswa putra. Lingkungan aman, akses mudah ke transportasi umum.',
    'Jl. Raya Bintaro No. 45, RT 03/RW 07',
    'Tangerang Selatan', 'Pesanggrahan',
    -6.2641, 106.7944,
    ARRAY['parking', 'cctv', 'security_24h', 'laundry_area'],
    'male',
    E'1. Tamu tidak diperkenankan menginap\n2. Jam malam pukul 22.00\n3. Dilarang membawa hewan peliharaan\n4. Sampah dibuang sesuai jadwal',
    1, 10, TRUE
  ),
  (
    property2_id, owner1_id,
    'Kos Griya Putri Harmoni',
    'Kosan eksklusif untuk perempuan, fasilitas lengkap, keamanan terjamin 24 jam.',
    'Jl. Ciputat Raya No. 12, Blok C',
    'Jakarta Selatan', 'Ciputat',
    -6.2856, 106.7521,
    ARRAY['parking', 'security_24h', 'cctv', 'wifi_area', 'common_room'],
    'female',
    E'1. Khusus penghuni perempuan\n2. Tamu perempuan diizinkan s/d pukul 21.00\n3. Menjaga kebersihan bersama\n4. Dilarang merokok di dalam kamar',
    1, 14, TRUE
  ),
  (
    property3_id, owner2_id,
    'Apartemen Mini Bu Siti',
    'Studio modern di lokasi strategis, ideal untuk profesional muda dan pasangan.',
    'Jl. TB Simatupang No. 88, Tower A Lt. 5',
    'Jakarta Selatan', 'Pasar Minggu',
    -6.3127, 106.8289,
    ARRAY['parking', 'swimming_pool', 'gym', 'security_24h', 'cctv', 'wifi_area'],
    'mixed',
    E'1. Dilarang membuat keributan setelah pukul 22.00\n2. Tamu diizinkan s/d pukul 22.00\n3. Satu unit maksimal 2 orang',
    5, 10, TRUE
  );

  -- ──────────────────────────────────────────────────────────
  -- ROOMS — Properti 1 (6 kamar, berbagai kombinasi fasilitas)
  -- ──────────────────────────────────────────────────────────

  INSERT INTO public.rooms (id, property_id, room_number, room_type, floor_number, size_sqm, base_price, status) VALUES
    (room_p1_a1, property1_id, 'A1', 'deluxe', 1, 12.0, 1200000, 'occupied'),   -- Terisi
    (room_p1_a2, property1_id, 'A2', 'standard', 1, 9.0, 900000, 'available'),
    (room_p1_b1, property1_id, 'B1', 'deluxe', 1, 12.0, 1200000, 'pending'),    -- Ada pengajuan
    (room_p1_b2, property1_id, 'B2', 'standard', 1, 9.0, 900000, 'available'),
    (room_p1_c1, property1_id, 'C1', 'suite', 2, 16.0, 1800000, 'available'),
    (room_p1_c2, property1_id, 'C2', 'maintenance', 2, 16.0, 1800000, 'maintenance');

  -- ROOMS — Properti 2 (4 kamar)
  INSERT INTO public.rooms (id, property_id, room_number, room_type, floor_number, size_sqm, base_price, status) VALUES
    (room_p2_101, property2_id, '101', 'standard', 1, 10.0, 1100000, 'occupied'),
    (room_p2_102, property2_id, '102', 'deluxe', 1, 13.0, 1500000, 'available'),
    (room_p2_201, property2_id, '201', 'deluxe', 2, 13.0, 1500000, 'available'),
    (room_p2_202, property2_id, '202', 'suite', 2, 18.0, 2000000, 'available');

  -- ROOMS — Properti 3 (3 kamar studio)
  INSERT INTO public.rooms (id, property_id, room_number, room_type, floor_number, size_sqm, base_price, status) VALUES
    (room_p3_s1, property3_id, 'S01', 'studio', 5, 22.0, 3500000, 'occupied'),
    (room_p3_s2, property3_id, 'S02', 'studio', 5, 22.0, 3500000, 'available'),
    (room_p3_s3, property3_id, 'S03', 'studio', 5, 25.0, 4000000, 'available');

  -- ──────────────────────────────────────────────────────────
  -- ROOM_FACILITIES — kombinasi berbeda per kamar (RB-13)
  -- Kamar A1: AC + WiFi + KM Dalam + WH + Kasur + Lemari + Meja
  -- Kamar A2: WiFi + Kasur + Lemari + Meja (tanpa AC, tanpa KM Dalam)
  -- Kamar B1: AC + WiFi + KM Dalam + Kasur + Lemari
  -- Kamar C1: AC + WiFi + KM Dalam + WH + Kasur + Lemari + Meja + Kulkas + TV
  -- ──────────────────────────────────────────────────────────

  -- Kamar A1 (deluxe + full facilities)
  INSERT INTO public.room_facilities (room_id, facility_id, is_active, additional_cost) VALUES
    (room_p1_a1, fac_ac, TRUE, 100000),
    (room_p1_a1, fac_wifi, TRUE, NULL),
    (room_p1_a1, fac_bathroom_in, TRUE, NULL),
    (room_p1_a1, fac_water_heater, TRUE, NULL),
    (room_p1_a1, fac_bed, TRUE, NULL),
    (room_p1_a1, fac_wardrobe, TRUE, NULL),
    (room_p1_a1, fac_desk, TRUE, NULL);

  -- Kamar A2 (standard — tanpa AC, tanpa KM Dalam)
  INSERT INTO public.room_facilities (room_id, facility_id, is_active, additional_cost) VALUES
    (room_p1_a2, fac_wifi, TRUE, NULL),
    (room_p1_a2, fac_bed, TRUE, NULL),
    (room_p1_a2, fac_wardrobe, TRUE, NULL),
    (room_p1_a2, fac_desk, TRUE, NULL);

  -- Kamar B1 (deluxe — AC tapi tanpa Water Heater)
  INSERT INTO public.room_facilities (room_id, facility_id, is_active, additional_cost) VALUES
    (room_p1_b1, fac_ac, TRUE, 100000),
    (room_p1_b1, fac_wifi, TRUE, NULL),
    (room_p1_b1, fac_bathroom_in, TRUE, NULL),
    (room_p1_b1, fac_bed, TRUE, NULL),
    (room_p1_b1, fac_wardrobe, TRUE, NULL);

  -- Kamar C1 (suite — semua lengkap + kulkas + TV)
  INSERT INTO public.room_facilities (room_id, facility_id, is_active, additional_cost) VALUES
    (room_p1_c1, fac_ac, TRUE, NULL),
    (room_p1_c1, fac_wifi, TRUE, NULL),
    (room_p1_c1, fac_bathroom_in, TRUE, NULL),
    (room_p1_c1, fac_water_heater, TRUE, NULL),
    (room_p1_c1, fac_bed, TRUE, NULL),
    (room_p1_c1, fac_wardrobe, TRUE, NULL),
    (room_p1_c1, fac_desk, TRUE, NULL),
    (room_p1_c1, fac_fridge, TRUE, NULL),
    (room_p1_c1, fac_tv, TRUE, NULL);

  -- Properti 2, Kamar 101 & 102
  INSERT INTO public.room_facilities (room_id, facility_id, is_active, additional_cost) VALUES
    (room_p2_101, fac_wifi, TRUE, NULL),
    (room_p2_101, fac_bed, TRUE, NULL),
    (room_p2_101, fac_wardrobe, TRUE, NULL),
    (room_p2_102, fac_ac, TRUE, NULL),
    (room_p2_102, fac_wifi, TRUE, NULL),
    (room_p2_102, fac_bathroom_in, TRUE, NULL),
    (room_p2_102, fac_water_heater, TRUE, NULL),
    (room_p2_102, fac_bed, TRUE, NULL),
    (room_p2_102, fac_wardrobe, TRUE, NULL);

  -- Properti 3, Studio S01 & S02
  INSERT INTO public.room_facilities (room_id, facility_id, is_active, additional_cost) VALUES
    (room_p3_s1, fac_ac, TRUE, NULL),
    (room_p3_s1, fac_wifi, TRUE, NULL),
    (room_p3_s1, fac_bathroom_in, TRUE, NULL),
    (room_p3_s1, fac_water_heater, TRUE, NULL),
    (room_p3_s1, fac_bed, TRUE, NULL),
    (room_p3_s1, fac_wardrobe, TRUE, NULL),
    (room_p3_s1, fac_fridge, TRUE, NULL),
    (room_p3_s1, fac_tv, TRUE, NULL),
    (room_p3_s2, fac_ac, TRUE, NULL),
    (room_p3_s2, fac_wifi, TRUE, NULL),
    (room_p3_s2, fac_bathroom_in, TRUE, NULL),
    (room_p3_s2, fac_water_heater, TRUE, NULL),
    (room_p3_s2, fac_bed, TRUE, NULL),
    (room_p3_s2, fac_wardrobe, TRUE, NULL);

  -- ──────────────────────────────────────────────────────────
  -- RENTAL REQUESTS (beberapa status berbeda untuk testing)
  -- ──────────────────────────────────────────────────────────

  -- Request approved (sudah ada kontrak) — tenant1 di kamar A1
  INSERT INTO public.rental_requests (
    id, room_id, tenant_id, owner_id, status,
    requested_start_date, duration_months, monthly_rate,
    reviewed_at
  ) VALUES (
    uuid_generate_v4(), room_p1_a1, tenant1_id, owner1_id, 'approved',
    '2026-06-01', 12, 1200000, '2026-05-25 10:00:00+07'
  );

  -- Request pending — tenant3 di kamar B1
  INSERT INTO public.rental_requests (
    id, room_id, tenant_id, owner_id, status,
    requested_start_date, duration_months, monthly_rate
  ) VALUES (
    uuid_generate_v4(), room_p1_b1, tenant3_id, owner1_id, 'pending',
    '2026-07-15', 6, 1200000
  );

  -- Request approved — tenant2 di kamar 101 properti 2
  INSERT INTO public.rental_requests (
    id, room_id, tenant_id, owner_id, status,
    requested_start_date, duration_months, monthly_rate,
    reviewed_at
  ) VALUES (
    uuid_generate_v4(), room_p2_101, tenant2_id, owner1_id, 'approved',
    '2026-05-01', 12, 1100000, '2026-04-25 14:00:00+07'
  );

  -- ──────────────────────────────────────────────────────────
  -- CONTRACTS (dari request yang approved)
  -- ──────────────────────────────────────────────────────────

  INSERT INTO public.contracts (
    id, rental_request_id, room_id, tenant_id, owner_id,
    start_date, end_date, monthly_rate, status
  )
  SELECT
    contract1_id,
    rr.id,
    room_p1_a1, tenant1_id, owner1_id,
    '2026-06-01', '2027-06-01', 1200000, 'active'
  FROM public.rental_requests rr
  WHERE rr.room_id = room_p1_a1 AND rr.status = 'approved'
  LIMIT 1;

  INSERT INTO public.contracts (
    id, rental_request_id, room_id, tenant_id, owner_id,
    start_date, end_date, monthly_rate, status
  )
  SELECT
    contract2_id,
    rr.id,
    room_p2_101, tenant2_id, owner1_id,
    '2026-05-01', '2027-05-01', 1100000, 'active'
  FROM public.rental_requests rr
  WHERE rr.room_id = room_p2_101 AND rr.status = 'approved'
  LIMIT 1;

  -- ──────────────────────────────────────────────────────────
  -- INVOICES & INVOICE ITEMS (berbagai status untuk testing)
  -- ──────────────────────────────────────────────────────────

  -- Invoice Juni 2026 — Tenant1, PAID
  INSERT INTO public.invoices (
    id, contract_id, room_id, tenant_id, owner_id,
    invoice_number, billing_period, due_date, total_amount, paid_amount, status
  ) VALUES (
    invoice1_id, contract1_id, room_p1_a1, tenant1_id, owner1_id,
    'INV-2026-06-0001', '2026-06-01', '2026-06-10', 1300000, 1300000, 'paid'
  );
  INSERT INTO public.invoice_items (invoice_id, name, quantity, unit_price, total_price, is_mandatory) VALUES
    (invoice1_id, 'Sewa Kamar', 1, 1200000, 1200000, TRUE),
    (invoice1_id, 'Biaya AC', 1, 100000, 100000, FALSE);

  -- Invoice Juli 2026 — Tenant1, UNPAID (baru generate)
  INSERT INTO public.invoices (
    id, contract_id, room_id, tenant_id, owner_id,
    invoice_number, billing_period, due_date, total_amount, paid_amount, status
  ) VALUES (
    invoice2_id, contract1_id, room_p1_a1, tenant1_id, owner1_id,
    'INV-2026-07-0001', '2026-07-01', '2026-07-10', 1450000, 0, 'unpaid'
  );
  INSERT INTO public.invoice_items (invoice_id, name, quantity, unit_price, total_price, is_mandatory) VALUES
    (invoice2_id, 'Sewa Kamar', 1, 1200000, 1200000, TRUE),
    (invoice2_id, 'Biaya AC', 1, 100000, 100000, FALSE),
    (invoice2_id, 'Listrik', 1, 150000, 150000, FALSE);

  -- Invoice Mei 2026 — Tenant2, OVERDUE
  INSERT INTO public.invoices (
    id, contract_id, room_id, tenant_id, owner_id,
    invoice_number, billing_period, due_date, total_amount, paid_amount, status
  ) VALUES (
    invoice3_id, contract2_id, room_p2_101, tenant2_id, owner1_id,
    'INV-2026-05-0001', '2026-05-01', '2026-05-15', 1100000, 0, 'overdue'
  );
  INSERT INTO public.invoice_items (invoice_id, name, quantity, unit_price, total_price, is_mandatory) VALUES
    (invoice3_id, 'Sewa Kamar', 1, 1100000, 1100000, TRUE);

  -- ──────────────────────────────────────────────────────────
  -- PAYMENTS (riwayat pembayaran — immutable)
  -- ──────────────────────────────────────────────────────────

  -- Payment Invoice Juni 2026 (LUNAS)
  INSERT INTO public.payments (
    invoice_id, tenant_id, owner_id, amount, payment_method,
    status, gateway_transaction_id, paid_at
  ) VALUES (
    invoice1_id, tenant1_id, owner1_id, 1300000, 'gopay',
    'success', 'TXN-KOSANKU-2026-06-001', '2026-06-05 09:30:00+07'
  );

  -- ──────────────────────────────────────────────────────────
  -- FAVORITES
  -- ──────────────────────────────────────────────────────────

  INSERT INTO public.favorites (tenant_id, property_id) VALUES
    (tenant3_id, property1_id),
    (tenant3_id, property3_id);

  -- ──────────────────────────────────────────────────────────
  -- NOTIFICATIONS (contoh notifikasi berbagai tipe)
  -- ──────────────────────────────────────────────────────────

  INSERT INTO public.notifications (user_id, title, body, type, reference_id, reference_type, is_read) VALUES
    (tenant1_id, 'Tagihan Juli Tersedia', 'Tagihan bulan Juli 2026 sebesar Rp 1.450.000 sudah tersedia.', 'invoice_generated', invoice2_id, 'invoice', FALSE),
    (owner1_id, 'Pengajuan Sewa Baru', 'Rizki Pratama mengajukan sewa Kamar B1 mulai 15 Juli 2026.', 'rental_request', NULL, 'rental_request', FALSE),
    (tenant2_id, 'Tagihan Anda Jatuh Tempo', 'Tagihan bulan Mei 2026 sebesar Rp 1.100.000 telah melewati jatuh tempo.', 'invoice_overdue', invoice3_id, 'invoice', TRUE);

END;
$$;
