-- ============================================================
-- KosanKu — Migration 015: Allow Owners to View Rental Applicants
-- ============================================================

CREATE POLICY "owners_view_rental_applicants"
  ON public.users FOR SELECT
  USING (
    get_current_user_role() = 'owner'
    AND id IN (
      SELECT rr.tenant_id FROM public.rental_requests rr
      WHERE rr.owner_id = auth.uid()
    )
  );
