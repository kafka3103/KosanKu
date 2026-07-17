-- ============================================================
-- KosanKu — Migration 014: Update Auth Trigger
-- Supabase PostgreSQL
-- ============================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert into public.users
  -- If the user already exists, this will do nothing (ON CONFLICT DO NOTHING)
  INSERT INTO public.users (
    id, 
    email, 
    phone_number, 
    role, 
    full_name,
    avatar_url
  )
  VALUES (
    NEW.id,
    NEW.email,
    -- Extract phone from auth.users or raw_user_meta_data
    COALESCE(NEW.phone, NEW.raw_user_meta_data->>'phone'),
    -- Extract role from raw_user_meta_data or default to 'tenant'
    COALESCE(
      (NEW.raw_user_meta_data->>'role')::public.user_role_enum, 
      'tenant'::public.user_role_enum
    ),
    -- Extract full_name from raw_user_meta_data (Google uses 'full_name' or 'name')
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'),
    -- Extract avatar_url from Google ('picture', 'avatar_url') or fallback to Anonymous avatar
    COALESCE(
      NEW.raw_user_meta_data->>'avatar_url', 
      NEW.raw_user_meta_data->>'picture', 
      'https://ui-avatars.com/api/?name=' || COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', 'Anonymous') || '&background=random'
    )
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
