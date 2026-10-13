-- ============================================================
-- KosanKu — Migration 023: Fix favorites RLS for 'both' role
-- ============================================================

DROP POLICY IF EXISTS "tenants_manage_own_favorites" ON public.favorites;

CREATE POLICY "tenants_manage_own_favorites"
  ON public.favorites FOR ALL
  USING (tenant_id = auth.uid())
  WITH CHECK (
    tenant_id = auth.uid() 
    AND get_current_user_role() IN ('tenant', 'both')
  );
