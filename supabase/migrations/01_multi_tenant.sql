-- ============================================================
-- Multi-tenant migration
-- Each user gets their own customers/revizie/opravy.
-- Existing data is backfilled to info@revitherm.sk
--   (user_id: a528e756-f84f-4562-beb2-d2fd72274858)
-- kotle and komponenty stay shared (reference data).
-- ============================================================

BEGIN;

-- 1. Add user_id to per-user tables (nullable first for backfill)
ALTER TABLE customers ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE revizie   ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE opravy    ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- 2. Backfill existing rows
UPDATE customers SET user_id = 'a528e756-f84f-4562-beb2-d2fd72274858' WHERE user_id IS NULL;
UPDATE revizie   SET user_id = 'a528e756-f84f-4562-beb2-d2fd72274858' WHERE user_id IS NULL;
UPDATE opravy    SET user_id = 'a528e756-f84f-4562-beb2-d2fd72274858' WHERE user_id IS NULL;

-- 3. Make NOT NULL
ALTER TABLE customers ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE revizie   ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE opravy    ALTER COLUMN user_id SET NOT NULL;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_customers_user_id ON customers (user_id);
CREATE INDEX IF NOT EXISTS idx_revizie_user_id   ON revizie (user_id);
CREATE INDEX IF NOT EXISTS idx_opravy_user_id    ON opravy (user_id);

-- 4. Replace broad RLS policies with user-scoped
DROP POLICY IF EXISTS "auth_all_customers" ON customers;
DROP POLICY IF EXISTS "auth_all_revizie"   ON revizie;
DROP POLICY IF EXISTS "auth_all_opravy"    ON opravy;

CREATE POLICY "own_customers" ON customers
  FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "own_revizie" ON revizie
  FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "own_opravy" ON opravy
  FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 5. Profiles table for per-user branding (technician name, company, phone, email signature)
CREATE TABLE IF NOT EXISTS profiles (
  user_id      UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name    TEXT NOT NULL DEFAULT '',
  company_name TEXT NOT NULL DEFAULT 'Gas Service',
  phone        TEXT NOT NULL DEFAULT '',
  email        TEXT NOT NULL DEFAULT '',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "own_profile" ON profiles;
CREATE POLICY "own_profile" ON profiles
  FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Seed Revitherm branding for info@revitherm.sk
INSERT INTO profiles (user_id, full_name, company_name, phone, email)
VALUES (
  'a528e756-f84f-4562-beb2-d2fd72274858',
  'Jozef Pachník',
  'Revitherm | Gas service',
  '+421 904 885 444',
  'pachnik@revitherm.sk'
) ON CONFLICT (user_id) DO NOTHING;

-- 6. Auto-create empty profile when new user signs up
CREATE OR REPLACE FUNCTION public.create_profile_for_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.email, '')
  )
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.create_profile_for_new_user();

-- Backfill empty profiles for existing users (so they have something to edit)
INSERT INTO profiles (user_id, full_name, email)
SELECT id, COALESCE(raw_user_meta_data->>'full_name', ''), COALESCE(email, '')
FROM auth.users
ON CONFLICT (user_id) DO NOTHING;

COMMIT;
