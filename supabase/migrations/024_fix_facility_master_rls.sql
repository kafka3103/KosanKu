-- ============================================================
-- KosanKu — Migration 024: Allow owners to manage facility_master
-- ============================================================

-- Owner / Both bisa INSERT
CREATE POLICY "owners_insert_facility_master"
  ON public.facility_master FOR INSERT
  WITH CHECK (
    get_current_user_role() IN ('owner', 'both')
  );

-- Owner / Both bisa UPDATE
CREATE POLICY "owners_update_facility_master"
  ON public.facility_master FOR UPDATE
  USING (
    get_current_user_role() IN ('owner', 'both')
  )
  WITH CHECK (
    get_current_user_role() IN ('owner', 'both')
  );

-- Owner / Both bisa DELETE
CREATE POLICY "owners_delete_facility_master"
  ON public.facility_master FOR DELETE
  USING (
    get_current_user_role() IN ('owner', 'both')
  );
