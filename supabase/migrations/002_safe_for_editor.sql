-- ============================================================
-- KosanKu — Migration 002: RLS Policies (SAFE for SQL Editor)
-- ============================================================

-- Helper function
CREATE OR REPLACE FUNCTION get_current_user_role()
RETURNS user_role_enum AS $$
  SELECT role FROM public.users WHERE id = auth.uid();
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- Aktifkan RLS semua tabel
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
-- users
-- ============================================================
DROP POLICY IF EXISTS "users_select_own" ON public.users;
CREATE POLICY "users_select_own" ON public.users FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "users_update_own" ON public.users;
CREATE POLICY "users_update_own" ON public.users FOR UPDATE USING (auth.uid() = id);

DROP POLICY IF EXISTS "users_insert_own" ON public.users;
CREATE POLICY "users_insert_own" ON public.users FOR INSERT WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "owners_view_their_tenants" ON public.users;
CREATE POLICY "owners_view_their_tenants" ON public.users FOR SELECT
  USING (
    get_current_user_role() = 'owner'
    AND id IN (
      SELECT c.tenant_id FROM public.contracts c
      JOIN public.rooms r ON r.id = c.room_id
      JOIN public.properties p ON p.id = r.property_id
      WHERE p.owner_id = auth.uid() AND c.status = 'active'
    )
  );

-- ============================================================
-- owner_profiles
-- ============================================================
DROP POLICY IF EXISTS "owner_profiles_manage_own" ON public.owner_profiles;
CREATE POLICY "owner_profiles_manage_own" ON public.owner_profiles FOR ALL
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- ============================================================
-- tenant_profiles
-- ============================================================
DROP POLICY IF EXISTS "tenant_profiles_manage_own" ON public.tenant_profiles;
CREATE POLICY "tenant_profiles_manage_own" ON public.tenant_profiles FOR ALL
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "owners_view_tenant_profiles" ON public.tenant_profiles;
CREATE POLICY "owners_view_tenant_profiles" ON public.tenant_profiles FOR SELECT
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
-- properties
-- ============================================================
DROP POLICY IF EXISTS "owners_manage_own_properties" ON public.properties;
CREATE POLICY "owners_manage_own_properties" ON public.properties FOR ALL
  USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());

DROP POLICY IF EXISTS "tenants_view_active_properties" ON public.properties;
CREATE POLICY "tenants_view_active_properties" ON public.properties FOR SELECT
  USING (is_active = TRUE AND is_deleted = FALSE AND get_current_user_role() = 'tenant');

-- ============================================================
-- rooms
-- ============================================================
DROP POLICY IF EXISTS "owners_manage_own_rooms" ON public.rooms;
CREATE POLICY "owners_manage_own_rooms" ON public.rooms FOR ALL
  USING (property_id IN (SELECT id FROM public.properties WHERE owner_id = auth.uid()))
  WITH CHECK (property_id IN (SELECT id FROM public.properties WHERE owner_id = auth.uid()));

DROP POLICY IF EXISTS "tenants_view_active_rooms" ON public.rooms;
CREATE POLICY "tenants_view_active_rooms" ON public.rooms FOR SELECT
  USING (
    get_current_user_role() = 'tenant'
    AND is_deleted = FALSE
    AND property_id IN (SELECT id FROM public.properties WHERE is_active = TRUE AND is_deleted = FALSE)
  );

-- ============================================================
-- facility_master
-- ============================================================
DROP POLICY IF EXISTS "all_users_view_facility_master" ON public.facility_master;
CREATE POLICY "all_users_view_facility_master" ON public.facility_master FOR SELECT
  USING (auth.uid() IS NOT NULL AND is_active = TRUE);

-- ============================================================
-- room_facilities
-- ============================================================
DROP POLICY IF EXISTS "owners_manage_room_facilities" ON public.room_facilities;
CREATE POLICY "owners_manage_room_facilities" ON public.room_facilities FOR ALL
  USING (room_id IN (
    SELECT r.id FROM public.rooms r
    JOIN public.properties p ON p.id = r.property_id
    WHERE p.owner_id = auth.uid()
  ))
  WITH CHECK (room_id IN (
    SELECT r.id FROM public.rooms r
    JOIN public.properties p ON p.id = r.property_id
    WHERE p.owner_id = auth.uid()
  ));

DROP POLICY IF EXISTS "tenants_view_room_facilities" ON public.room_facilities;
CREATE POLICY "tenants_view_room_facilities" ON public.room_facilities FOR SELECT
  USING (
    get_current_user_role() = 'tenant'
    AND room_id IN (
      SELECT r.id FROM public.rooms r
      JOIN public.properties p ON p.id = r.property_id
      WHERE p.is_active = TRUE AND p.is_deleted = FALSE AND r.is_deleted = FALSE
    )
  );

-- ============================================================
-- rental_requests
-- ============================================================
DROP POLICY IF EXISTS "tenants_create_and_view_own_requests" ON public.rental_requests;
CREATE POLICY "tenants_create_and_view_own_requests" ON public.rental_requests FOR SELECT
  USING (tenant_id = auth.uid());

DROP POLICY IF EXISTS "tenants_insert_rental_request" ON public.rental_requests;
CREATE POLICY "tenants_insert_rental_request" ON public.rental_requests FOR INSERT
  WITH CHECK (tenant_id = auth.uid() AND get_current_user_role() = 'tenant');

DROP POLICY IF EXISTS "tenants_cancel_own_request" ON public.rental_requests;
CREATE POLICY "tenants_cancel_own_request" ON public.rental_requests FOR UPDATE
  USING (tenant_id = auth.uid() AND status = 'pending')
  WITH CHECK (tenant_id = auth.uid() AND status = 'cancelled');

DROP POLICY IF EXISTS "owners_view_own_property_requests" ON public.rental_requests;
CREATE POLICY "owners_view_own_property_requests" ON public.rental_requests FOR SELECT
  USING (owner_id = auth.uid());

DROP POLICY IF EXISTS "owners_review_rental_requests" ON public.rental_requests;
CREATE POLICY "owners_review_rental_requests" ON public.rental_requests FOR UPDATE
  USING (owner_id = auth.uid() AND status = 'pending')
  WITH CHECK (owner_id = auth.uid() AND status IN ('approved', 'rejected'));

-- ============================================================
-- contracts
-- ============================================================
DROP POLICY IF EXISTS "owners_view_own_contracts" ON public.contracts;
CREATE POLICY "owners_view_own_contracts" ON public.contracts FOR SELECT
  USING (owner_id = auth.uid());

DROP POLICY IF EXISTS "owners_update_contracts" ON public.contracts;
CREATE POLICY "owners_update_contracts" ON public.contracts FOR UPDATE
  USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());

DROP POLICY IF EXISTS "tenants_view_own_contracts" ON public.contracts;
CREATE POLICY "tenants_view_own_contracts" ON public.contracts FOR SELECT
  USING (tenant_id = auth.uid());

DROP POLICY IF EXISTS "system_insert_contracts" ON public.contracts;
CREATE POLICY "system_insert_contracts" ON public.contracts FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

-- ============================================================
-- invoices
-- ============================================================
DROP POLICY IF EXISTS "owners_view_own_invoices" ON public.invoices;
CREATE POLICY "owners_view_own_invoices" ON public.invoices FOR SELECT
  USING (owner_id = auth.uid());

DROP POLICY IF EXISTS "owners_manage_invoices" ON public.invoices;
CREATE POLICY "owners_manage_invoices" ON public.invoices FOR UPDATE
  USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());

DROP POLICY IF EXISTS "tenants_view_own_invoices" ON public.invoices;
CREATE POLICY "tenants_view_own_invoices" ON public.invoices FOR SELECT
  USING (tenant_id = auth.uid());

DROP POLICY IF EXISTS "system_insert_invoices" ON public.invoices;
CREATE POLICY "system_insert_invoices" ON public.invoices FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

-- ============================================================
-- invoice_items
-- ============================================================
DROP POLICY IF EXISTS "users_view_own_invoice_items" ON public.invoice_items;
CREATE POLICY "users_view_own_invoice_items" ON public.invoice_items FOR SELECT
  USING (invoice_id IN (
    SELECT id FROM public.invoices
    WHERE owner_id = auth.uid() OR tenant_id = auth.uid()
  ));

DROP POLICY IF EXISTS "owners_manage_invoice_items" ON public.invoice_items;
CREATE POLICY "owners_manage_invoice_items" ON public.invoice_items FOR INSERT
  WITH CHECK (invoice_id IN (
    SELECT id FROM public.invoices WHERE owner_id = auth.uid()
  ));

-- ============================================================
-- payments (IMMUTABLE)
-- ============================================================
DROP POLICY IF EXISTS "users_view_own_payments" ON public.payments;
CREATE POLICY "users_view_own_payments" ON public.payments FOR SELECT
  USING (tenant_id = auth.uid() OR owner_id = auth.uid());

DROP POLICY IF EXISTS "tenants_create_payment" ON public.payments;
CREATE POLICY "tenants_create_payment" ON public.payments FOR INSERT
  WITH CHECK (
    tenant_id = auth.uid()
    AND invoice_id IN (SELECT id FROM public.invoices WHERE tenant_id = auth.uid())
  );

DROP POLICY IF EXISTS "system_update_payment_status" ON public.payments;
CREATE POLICY "system_update_payment_status" ON public.payments FOR UPDATE
  USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

-- ============================================================
-- favorites
-- ============================================================
DROP POLICY IF EXISTS "tenants_manage_own_favorites" ON public.favorites;
CREATE POLICY "tenants_manage_own_favorites" ON public.favorites FOR ALL
  USING (tenant_id = auth.uid())
  WITH CHECK (tenant_id = auth.uid() AND get_current_user_role() = 'tenant');

-- ============================================================
-- notifications
-- ============================================================
DROP POLICY IF EXISTS "users_view_own_notifications" ON public.notifications;
CREATE POLICY "users_view_own_notifications" ON public.notifications FOR SELECT
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "users_mark_notification_read" ON public.notifications;
CREATE POLICY "users_mark_notification_read" ON public.notifications FOR UPDATE
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "system_insert_notifications" ON public.notifications;
CREATE POLICY "system_insert_notifications" ON public.notifications FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

-- ============================================================
-- fcm_tokens
-- ============================================================
DROP POLICY IF EXISTS "users_manage_own_fcm_tokens" ON public.fcm_tokens;
CREATE POLICY "users_manage_own_fcm_tokens" ON public.fcm_tokens FOR ALL
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- ============================================================
-- SELESAI: Migration 002
-- ============================================================
SELECT 'Migration 002 berhasil! RLS aktif di 15 tabel.' AS status;
