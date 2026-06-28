-- ============================================================
-- Multi-technician (Company) migration
-- Each user belongs to a company. Customers + revizie + opravy
-- are owned by the company so all technicians can see them.
-- A revízia/oprava still tracks which technician performed it.
-- ============================================================

BEGIN;

-- 1. Companies table
CREATE TABLE IF NOT EXISTS companies (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL DEFAULT 'Gas Service',
  phone       TEXT NOT NULL DEFAULT '',
  email       TEXT NOT NULL DEFAULT '',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;

-- 2. Add company_id + role to profiles (nullable initially for backfill)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id) ON DELETE CASCADE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'admin' CHECK (role IN ('admin', 'technician'));

-- 3. Backfill: create a company per existing profile (each user becomes admin of their own company)
-- Use a temp column to map company → profile.user_id during migration
ALTER TABLE companies ADD COLUMN IF NOT EXISTS migrate_user_id UUID;

INSERT INTO companies (name, phone, email, migrate_user_id)
SELECT
  COALESCE(NULLIF(p.company_name, ''), 'Gas Service'),
  p.phone,
  p.email,
  p.user_id
FROM profiles p
WHERE p.company_id IS NULL;

UPDATE profiles p
SET company_id = c.id, role = 'admin'
FROM companies c
WHERE c.migrate_user_id = p.user_id AND p.company_id IS NULL;

ALTER TABLE companies DROP COLUMN migrate_user_id;
ALTER TABLE profiles ALTER COLUMN company_id SET NOT NULL;

-- 4. Add company_id to customers/revizie/opravy
ALTER TABLE customers ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id) ON DELETE CASCADE;
ALTER TABLE revizie   ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id) ON DELETE CASCADE;
ALTER TABLE opravy    ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id) ON DELETE CASCADE;

-- Backfill from user_id via profiles
UPDATE customers c
SET company_id = p.company_id
FROM profiles p
WHERE p.user_id = c.user_id AND c.company_id IS NULL;

UPDATE revizie r
SET company_id = p.company_id
FROM profiles p
WHERE p.user_id = r.user_id AND r.company_id IS NULL;

UPDATE opravy o
SET company_id = p.company_id
FROM profiles p
WHERE p.user_id = o.user_id AND o.company_id IS NULL;

ALTER TABLE customers ALTER COLUMN company_id SET NOT NULL;
ALTER TABLE revizie   ALTER COLUMN company_id SET NOT NULL;
ALTER TABLE opravy    ALTER COLUMN company_id SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_customers_company_id ON customers (company_id);
CREATE INDEX IF NOT EXISTS idx_revizie_company_id   ON revizie (company_id);
CREATE INDEX IF NOT EXISTS idx_opravy_company_id    ON opravy (company_id);

-- 5. Helper function: company_id of currently authenticated user
CREATE OR REPLACE FUNCTION public.current_company_id()
RETURNS UUID
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT company_id FROM public.profiles WHERE user_id = auth.uid()
$$;

-- 6. Replace per-user RLS with company-scoped RLS
DROP POLICY IF EXISTS "own_customers" ON customers;
DROP POLICY IF EXISTS "own_revizie"   ON revizie;
DROP POLICY IF EXISTS "own_opravy"    ON opravy;
DROP POLICY IF EXISTS "own_profile"   ON profiles;
DROP POLICY IF EXISTS "own_company"   ON companies;

CREATE POLICY "company_customers" ON customers
  FOR ALL TO authenticated
  USING (company_id = public.current_company_id())
  WITH CHECK (company_id = public.current_company_id());

CREATE POLICY "company_revizie" ON revizie
  FOR ALL TO authenticated
  USING (company_id = public.current_company_id())
  WITH CHECK (company_id = public.current_company_id());

CREATE POLICY "company_opravy" ON opravy
  FOR ALL TO authenticated
  USING (company_id = public.current_company_id())
  WITH CHECK (company_id = public.current_company_id());

-- Team members can see each other's profiles within the same company
CREATE POLICY "team_profiles" ON profiles
  FOR ALL TO authenticated
  USING (company_id = public.current_company_id())
  WITH CHECK (company_id = public.current_company_id());

-- A user can view their own company; only admins can update
CREATE POLICY "company_select" ON companies
  FOR SELECT TO authenticated
  USING (id = public.current_company_id());

CREATE POLICY "company_admin_update" ON companies
  FOR UPDATE TO authenticated
  USING (
    id = public.current_company_id()
    AND EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'admin' AND company_id = companies.id)
  )
  WITH CHECK (
    id = public.current_company_id()
    AND EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'admin' AND company_id = companies.id)
  );

-- 7. Update new-user trigger: if invited (company_id in metadata) join existing; otherwise create own company
CREATE OR REPLACE FUNCTION public.create_profile_for_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_company_id UUID;
  v_role TEXT;
BEGIN
  v_company_id := NULLIF(NEW.raw_user_meta_data->>'company_id', '')::UUID;
  v_role := COALESCE(NULLIF(NEW.raw_user_meta_data->>'role', ''), 'admin');

  IF v_company_id IS NULL THEN
    -- Self-signup: create a new company; user becomes admin
    INSERT INTO companies (name, email)
    VALUES ('Gas Service', COALESCE(NEW.email, ''))
    RETURNING id INTO v_company_id;
    v_role := 'admin';
  END IF;

  INSERT INTO profiles (user_id, company_id, role, full_name, email)
  VALUES (
    NEW.id,
    v_company_id,
    v_role,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.email, '')
  )
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- Re-create trigger (function definition already replaced above)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.create_profile_for_new_user();

COMMIT;
