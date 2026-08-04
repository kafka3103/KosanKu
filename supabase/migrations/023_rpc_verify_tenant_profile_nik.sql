-- Migration: Create RPC to update tenant profile NIK on rental approval bypassing RLS

CREATE OR REPLACE FUNCTION verify_tenant_profile_nik(p_tenant_id UUID, p_tenant_nik TEXT)
RETURNS VOID AS $$
BEGIN
  IF p_tenant_nik IS NOT NULL THEN
    INSERT INTO public.tenant_profiles (user_id, ktp_number, is_verified)
    VALUES (p_tenant_id, p_tenant_nik, true)
    ON CONFLICT (user_id) DO UPDATE
    SET ktp_number = EXCLUDED.ktp_number,
        is_verified = EXCLUDED.is_verified,
        updated_at = NOW();
  ELSE
    UPDATE public.tenant_profiles
    SET is_verified = true, updated_at = NOW()
    WHERE user_id = p_tenant_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
