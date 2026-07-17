-- ============================================================
-- KosanKu — Migration 009: Auth Trigger for Users
-- Supabase PostgreSQL
-- Deskripsi: Trigger untuk secara otomatis membuat entri di tabel 
--            public.users setiap kali ada user baru yang mendaftar
--            melalui Supabase Auth.
-- ============================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert into public.users
  -- If the user already exists (e.g., from Google Sign-In manual upsert), 
  -- this will do nothing (ON CONFLICT DO NOTHING)
  INSERT INTO public.users (
    id, 
    email, 
    phone_number, 
    role, 
    full_name
  )
  VALUES (
    NEW.id,
    NEW.email,
    NEW.phone,
    -- Extract role from raw_user_meta_data or default to 'tenant'
    COALESCE(
      (NEW.raw_user_meta_data->>'role')::public.user_role_enum, 
      'tenant'::public.user_role_enum
    ),
    -- Extract full_name from raw_user_meta_data (Google/Frontend)
    NEW.raw_user_meta_data->>'full_name'
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Hapus trigger jika sudah ada sebelumnya agar tidak error
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Buat trigger pada auth.users
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
