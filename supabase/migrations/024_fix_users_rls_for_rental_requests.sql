-- Migration: Fix RLS Policy so owners with 'both' role can view rental applicants

DROP POLICY IF EXISTS "owners_view_rental_applicants" ON public.users;
CREATE POLICY "owners_view_rental_applicants"
  ON public.users FOR SELECT
  USING (
    get_current_user_role() IN ('owner', 'both')
    AND id IN (
      SELECT rr.tenant_id FROM public.rental_requests rr
      WHERE rr.owner_id = auth.uid()
    )
  );
