-- ============================================================
-- KosanKu — Migration 002: Row Level Security (RLS) Policies
-- Supabase PostgreSQL
-- Deskripsi: Mengaktifkan RLS dan mendefinisikan policy akses
--            data per role (Owner/Tenant) sesuai aturan bisnis
-- ============================================================

-- Helper function: ambil user_id dari JWT yang sedang aktif
-- (sudah tersedia di Supabase sebagai auth.uid())

-- Helper function: ambil role user dari tabel users
CREATE OR REPLACE FUNCTION get_current_user_role()
RETURNS user_role_enum AS $$
  SELECT role FROM public.users WHERE id = auth.uid();
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- ============================================================
-- AKTIFKAN RLS UNTUK SEMUA TABEL
-- ============================================================

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.owner_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.facility_master ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_facilities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rental_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fcm_tokens ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- TABEL: users
-- ============================================================

-- User bisa lihat profil sendiri
CREATE POLICY "users_select_own"
  ON public.users FOR SELECT
  USING (auth.uid() = id);

-- User bisa update profil sendiri
CREATE POLICY "users_update_own"
  ON public.users FOR UPDATE
  USING (auth.uid() = id);

-- Insert hanya via trigger/function (setelah auth.users create)
CREATE POLICY "users_insert_own"
  ON public.users FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Owner bisa lihat basic info Tenant yang ada kaitannya dengan propertinya
-- (dibutuhkan untuk halaman TenantListScreen)
CREATE POLICY "owners_view_their_tenants"
  ON public.users FOR SELECT
  USING (
    get_current_user_role() = 'owner'
    AND id IN (
      SELECT c.tenant_id FROM public.contracts c
      JOIN public.rooms r ON r.id = c.room_id
      JOIN public.properties p ON p.id = r.property_id
      WHERE p.owner_id = auth.uid()
        AND c.status = 'active'
    )
  );

-- ============================================================
-- TABEL: owner_profiles
-- ============================================================

CREATE POLICY "owner_profiles_manage_own"
  ON public.owner_profiles FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ============================================================
-- TABEL: tenant_profiles
-- ============================================================

-- Tenant hanya bisa kelola profil sendiri
CREATE POLICY "tenant_profiles_manage_own"
  ON public.tenant_profiles FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Owner bisa lihat profil tenant (TANPA ktp_photo_url) yang ada di propertinya
-- Kolom ktp_photo_url diproteksi via storage policy, bukan RLS kolom
CREATE POLICY "owners_view_tenant_profiles"
  ON public.tenant_profiles FOR SELECT
  USING (
    get_current_user_role() = 'owner'
    AND user_id IN (
      SELECT c.tenant_id FROM public.contracts c
      JOIN public.rooms r ON r.id = c.room_id
      JOIN public.properties p ON p.id = r.property_id
      WHERE p.owner_id = auth.uid()
    )
  );

-- ============================================================
-- TABEL: properties
-- ============================================================

-- Owner hanya bisa lihat & kelola properti miliknya sendiri
CREATE POLICY "owners_manage_own_properties"
  ON public.properties FOR ALL
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

-- Tenant (dan public) bisa lihat properti yang aktif dan tidak dihapus
CREATE POLICY "tenants_view_active_properties"
  ON public.properties FOR SELECT
  USING (
    is_active = TRUE
    AND is_deleted = FALSE
    AND get_current_user_role() = 'tenant'
  );

-- ============================================================
-- TABEL: rooms
-- ============================================================

-- Owner hanya bisa kelola kamar di propertinya sendiri
CREATE POLICY "owners_manage_own_rooms"
  ON public.rooms FOR ALL
  USING (
    property_id IN (
      SELECT id FROM public.properties WHERE owner_id = auth.uid()
    )
  )
  WITH CHECK (
    property_id IN (
      SELECT id FROM public.properties WHERE owner_id = auth.uid()
    )
  );

-- Tenant bisa lihat kamar dari properti yang aktif
CREATE POLICY "tenants_view_active_rooms"
  ON public.rooms FOR SELECT
  USING (
    get_current_user_role() = 'tenant'
    AND is_deleted = FALSE
    AND property_id IN (
      SELECT id FROM public.properties WHERE is_active = TRUE AND is_deleted = FALSE
    )
  );

-- ============================================================
-- TABEL: facility_master (baca publik, write hanya admin)
-- ============================================================

CREATE POLICY "all_users_view_facility_master"
  ON public.facility_master FOR SELECT
  USING (auth.uid() IS NOT NULL AND is_active = TRUE);

-- ============================================================
-- TABEL: room_facilities
-- ============================================================

-- Owner kelola fasilitas kamar miliknya
CREATE POLICY "owners_manage_room_facilities"
  ON public.room_facilities FOR ALL
  USING (
    room_id IN (
      SELECT r.id FROM public.rooms r
      JOIN public.properties p ON p.id = r.property_id
      WHERE p.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    room_id IN (
      SELECT r.id FROM public.rooms r
      JOIN public.properties p ON p.id = r.property_id
      WHERE p.owner_id = auth.uid()
    )
  );

-- Tenant lihat fasilitas kamar dari properti aktif
CREATE POLICY "tenants_view_room_facilities"
  ON public.room_facilities FOR SELECT
  USING (
    get_current_user_role() = 'tenant'
    AND room_id IN (
      SELECT r.id FROM public.rooms r
      JOIN public.properties p ON p.id = r.property_id
      WHERE p.is_active = TRUE AND p.is_deleted = FALSE AND r.is_deleted = FALSE
    )
  );

-- ============================================================
-- TABEL: rental_requests
-- ============================================================

-- Tenant bisa INSERT pengajuan baru & SELECT milik sendiri
CREATE POLICY "tenants_create_and_view_own_requests"
  ON public.rental_requests FOR SELECT
  USING (tenant_id = auth.uid());

CREATE POLICY "tenants_insert_rental_request"
  ON public.rental_requests FOR INSERT
  WITH CHECK (
    tenant_id = auth.uid()
    AND get_current_user_role() = 'tenant'
  );

-- Tenant bisa cancel pengajuannya sendiri yang masih pending
CREATE POLICY "tenants_cancel_own_request"
  ON public.rental_requests FOR UPDATE
  USING (
    tenant_id = auth.uid()
    AND status = 'pending'
  )
  WITH CHECK (
    tenant_id = auth.uid()
    AND status = 'cancelled'
  );

-- Owner bisa lihat & approve/reject pengajuan untuk propertinya
CREATE POLICY "owners_view_own_property_requests"
  ON public.rental_requests FOR SELECT
  USING (owner_id = auth.uid());

CREATE POLICY "owners_review_rental_requests"
  ON public.rental_requests FOR UPDATE
  USING (
    owner_id = auth.uid()
    AND status = 'pending'
  )
  WITH CHECK (
    owner_id = auth.uid()
    AND status IN ('approved', 'rejected')
  );

-- ============================================================
-- TABEL: contracts
-- ============================================================

-- Owner lihat kontrak propertinya
CREATE POLICY "owners_view_own_contracts"
  ON public.contracts FOR SELECT
  USING (owner_id = auth.uid());

-- Owner update kontrak (untuk pengakhiran)
CREATE POLICY "owners_update_contracts"
  ON public.contracts FOR UPDATE
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

-- Tenant lihat kontrak sendiri
CREATE POLICY "tenants_view_own_contracts"
  ON public.contracts FOR SELECT
  USING (tenant_id = auth.uid());

-- INSERT kontrak oleh system (service_role) atau Owner terautentikasi
CREATE POLICY "system_insert_contracts"
  ON public.contracts FOR INSERT
  WITH CHECK (auth.role() IN ('authenticated', 'service_role'));

-- ============================================================
-- TABEL: invoices
-- ============================================================

-- Owner lihat tagihan propertinya
CREATE POLICY "owners_view_own_invoices"
  ON public.invoices FOR SELECT
  USING (owner_id = auth.uid());

-- Owner bisa tambah item tagihan
CREATE POLICY "owners_manage_invoices"
  ON public.invoices FOR UPDATE
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

-- Tenant hanya lihat tagihan sendiri
CREATE POLICY "tenants_view_own_invoices"
  ON public.invoices FOR SELECT
  USING (tenant_id = auth.uid());

-- INSERT invoice oleh system (service_role) atau Owner terautentikasi
CREATE POLICY "system_insert_invoices"
  ON public.invoices FOR INSERT
  WITH CHECK (auth.role() IN ('authenticated', 'service_role'));

-- ============================================================
-- TABEL: invoice_items
-- ============================================================

-- Lihat item tagihan: Owner dan Tenant terkait
CREATE POLICY "users_view_own_invoice_items"
  ON public.invoice_items FOR SELECT
  USING (
    invoice_id IN (
      SELECT id FROM public.invoices
      WHERE owner_id = auth.uid() OR tenant_id = auth.uid()
    )
  );

-- Owner bisa tambah item tagihan tambahan (listrik, air, dll)
CREATE POLICY "owners_manage_invoice_items"
  ON public.invoice_items FOR INSERT
  WITH CHECK (
    invoice_id IN (
      SELECT id FROM public.invoices WHERE owner_id = auth.uid()
    )
  );

-- ============================================================
-- TABEL: payments — IMMUTABLE (append-only)
-- ============================================================

-- SELECT: Owner dan Tenant terkait
CREATE POLICY "users_view_own_payments"
  ON public.payments FOR SELECT
  USING (
    tenant_id = auth.uid()
    OR owner_id = auth.uid()
  );

-- INSERT: Tenant bisa membuat record pembayaran untuk tagihan miliknya
CREATE POLICY "tenants_create_payment"
  ON public.payments FOR INSERT
  WITH CHECK (
    tenant_id = auth.uid()
    AND invoice_id IN (
      SELECT id FROM public.invoices WHERE tenant_id = auth.uid()
    )
  );

-- UPDATE: HANYA via service_role (payment gateway webhook via Edge Function)
-- Tidak ada policy UPDATE untuk user biasa = immutable setelah INSERT
CREATE POLICY "system_update_payment_status"
  ON public.payments FOR UPDATE
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- DELETE: Tidak ada policy = tidak bisa dihapus oleh siapapun
-- (immutable requirement — RB)

-- ============================================================
-- TABEL: favorites
-- ============================================================

CREATE POLICY "tenants_manage_own_favorites"
  ON public.favorites FOR ALL
  USING (tenant_id = auth.uid())
  WITH CHECK (tenant_id = auth.uid() AND get_current_user_role() = 'tenant');

-- ============================================================
-- TABEL: notifications
-- ============================================================

CREATE POLICY "users_view_own_notifications"
  ON public.notifications FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "users_mark_notification_read"
  ON public.notifications FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- INSERT oleh system (service_role) atau pengguna terautentikasi (authenticated)
CREATE POLICY "system_insert_notifications"
  ON public.notifications FOR INSERT
  WITH CHECK (auth.role() IN ('authenticated', 'service_role'));

-- ============================================================
-- TABEL: fcm_tokens
-- ============================================================

CREATE POLICY "users_manage_own_fcm_tokens"
  ON public.fcm_tokens FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ============================================================
-- SUPABASE STORAGE POLICIES
-- (Jalankan setelah membuat buckets di Supabase Dashboard)
-- ============================================================

-- Bucket: 'avatars' — foto profil user
-- Bucket: 'property-photos' — foto properti dan kamar
-- Bucket: 'ktp-photos' — foto KTP Tenant (SANGAT terbatas)

-- Policy untuk 'ktp-photos' bucket (paling kritis):
-- Hanya Tenant pemilik KTP dan Owner terkait yang bisa akses

-- Catatan: Storage policies didefinisikan di Supabase Dashboard
-- atau via supabase/storage.sql (terpisah dari migration ini)
-- karena sintaksis storage policy berbeda dari RLS table policy
