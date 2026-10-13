-- ============================================================
-- KosanKu — Migration 016: Fix RLS Policies for 'both' role
-- Deskripsi: Mengizinkan user dengan role 'both' untuk mengakses
--            data tenant dan owner sekaligus.
-- ============================================================

-- 1. users: owners_view_their_tenants
DROP POLICY IF EXISTS "owners_view_their_tenants" ON public.users;
CREATE POLICY "owners_view_their_tenants"
  ON public.users FOR SELECT
  USING (
    get_current_user_role() IN ('owner', 'both')
    AND id IN (
      SELECT c.tenant_id FROM public.contracts c
      JOIN public.rooms r ON r.id = c.room_id
      JOIN public.properties p ON p.id = r.property_id
      WHERE p.owner_id = auth.uid()
        AND c.status = 'active'
    )
  );

-- 2. tenant_profiles: owners_view_tenant_profiles
DROP POLICY IF EXISTS "owners_view_tenant_profiles" ON public.tenant_profiles;
CREATE POLICY "owners_view_tenant_profiles"
  ON public.tenant_profiles FOR SELECT
  USING (
    get_current_user_role() IN ('owner', 'both')
    AND user_id IN (
      SELECT c.tenant_id FROM public.contracts c
      JOIN public.rooms r ON r.id = c.room_id
      JOIN public.properties p ON p.id = r.property_id
      WHERE p.owner_id = auth.uid()
    )
  );

-- 3. properties: tenants_view_active_properties
DROP POLICY IF EXISTS "tenants_view_active_properties" ON public.properties;
CREATE POLICY "tenants_view_active_properties"
  ON public.properties FOR SELECT
  USING (
    is_active = TRUE
    AND is_deleted = FALSE
    AND get_current_user_role() IN ('tenant', 'both')
  );

-- 4. rooms: tenants_view_active_rooms
DROP POLICY IF EXISTS "tenants_view_active_rooms" ON public.rooms;
CREATE POLICY "tenants_view_active_rooms"
  ON public.rooms FOR SELECT
  USING (
    get_current_user_role() IN ('tenant', 'both')
    AND is_deleted = FALSE
    AND property_id IN (
      SELECT id FROM public.properties WHERE is_active = TRUE AND is_deleted = FALSE
    )
  );

-- 5. facility_master: tenants_view_facilities
DROP POLICY IF EXISTS "tenants_view_facilities" ON public.facility_master;
CREATE POLICY "tenants_view_facilities"
  ON public.facility_master FOR SELECT
  USING (
    get_current_user_role() IN ('tenant', 'both')
  );

-- 6. room_facilities: tenants_view_room_facilities
DROP POLICY IF EXISTS "tenants_view_room_facilities" ON public.room_facilities;
CREATE POLICY "tenants_view_room_facilities"
  ON public.room_facilities FOR SELECT
  USING (
    get_current_user_role() IN ('tenant', 'both')
  );

-- 7. reviews: tenants_create_review
DROP POLICY IF EXISTS "tenants_create_review" ON public.reviews;
CREATE POLICY "tenants_create_review"
  ON public.reviews FOR INSERT
  WITH CHECK (
    tenant_id = auth.uid() 
    AND get_current_user_role() IN ('tenant', 'both')
  );
