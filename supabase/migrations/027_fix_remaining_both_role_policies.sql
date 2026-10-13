-- ============================================================
-- KosanKu — Migration 027: Fix RLS Policies for 'both' role
-- Deskripsi: Memperbaiki policy pada tabel favorites dan rental_requests
--            agar user dengan role 'both' bisa melakukan aksi sebagai tenant.
-- ============================================================

-- 1. favorites: tenants_manage_own_favorites
DROP POLICY IF EXISTS "tenants_manage_own_favorites" ON public.favorites;
CREATE POLICY "tenants_manage_own_favorites"
  ON public.favorites FOR ALL
  USING (tenant_id = auth.uid())
  WITH CHECK (
    tenant_id = auth.uid() 
    AND get_current_user_role() IN ('tenant', 'both')
  );

-- 2. rental_requests: tenants_insert_rental_request
DROP POLICY IF EXISTS "tenants_insert_rental_request" ON public.rental_requests;
CREATE POLICY "tenants_insert_rental_request"
  ON public.rental_requests FOR INSERT
  WITH CHECK (
    tenant_id = auth.uid()
    AND get_current_user_role() IN ('tenant', 'both')
  );
