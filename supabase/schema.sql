-- ============================================================
-- ServisBook - Supabase Schema
-- ============================================================

-- Enable UUID extension (optional, we use serial IDs here)
-- CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- TABLE: kotle (boiler models)
-- ============================================================
CREATE TABLE IF NOT EXISTS kotle (
  id   SERIAL PRIMARY KEY,
  nazov TEXT NOT NULL UNIQUE
);

-- ============================================================
-- TABLE: komponenty (spare parts / components)
-- ============================================================
CREATE TABLE IF NOT EXISTS komponenty (
  id    SERIAL PRIMARY KEY,
  nazov TEXT NOT NULL UNIQUE
);

-- ============================================================
-- TABLE: customers
-- ============================================================
CREATE TABLE IF NOT EXISTS customers (
  id         SERIAL PRIMARY KEY,
  nazov      TEXT NOT NULL,
  ulica      TEXT NOT NULL DEFAULT '',
  mesto      TEXT NOT NULL DEFAULT '',
  tel        TEXT NOT NULL DEFAULT '',
  email      TEXT NOT NULL DEFAULT '',
  kotol      TEXT NOT NULL DEFAULT '',
  interval   TEXT NOT NULL DEFAULT '1 rok',
  datum_m    DATE,
  poznamka   TEXT NOT NULL DEFAULT '',
  sluzba     TEXT NOT NULL DEFAULT 'Servis',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for faster search
CREATE INDEX IF NOT EXISTS idx_customers_nazov ON customers (nazov);
CREATE INDEX IF NOT EXISTS idx_customers_mesto  ON customers (mesto);

-- ============================================================
-- TABLE: revizie (service inspection protocols)
-- ============================================================
CREATE TABLE IF NOT EXISTS revizie (
  id            SERIAL PRIMARY KEY,
  customer_id   INTEGER REFERENCES customers (id) ON DELETE SET NULL,
  umiestnenie   TEXT NOT NULL DEFAULT '',
  vyrobne_cislo TEXT NOT NULL DEFAULT '',
  datum         DATE NOT NULL DEFAULT CURRENT_DATE,
  checks        JSONB NOT NULL DEFAULT '[]',
  poznamka      TEXT NOT NULL DEFAULT '',
  sposobile     BOOLEAN,
  reminder_sent BOOLEAN NOT NULL DEFAULT FALSE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_revizie_customer_id   ON revizie (customer_id);
CREATE INDEX IF NOT EXISTS idx_revizie_datum         ON revizie (datum);
CREATE INDEX IF NOT EXISTS idx_revizie_reminder_sent ON revizie (reminder_sent);

-- ============================================================
-- TABLE: opravy (repair / service call records)
-- ============================================================
CREATE TABLE IF NOT EXISTS opravy (
  id                  SERIAL PRIMARY KEY,
  customer_id         INTEGER REFERENCES customers (id) ON DELETE SET NULL,
  servisny_list_cislo TEXT NOT NULL DEFAULT '',
  datum_vyjazdu       DATE NOT NULL DEFAULT CURRENT_DATE,
  cas_od              TEXT NOT NULL DEFAULT '',
  cas_do              TEXT NOT NULL DEFAULT '',
  vyrobne_cislo       TEXT NOT NULL DEFAULT '',
  nahlasena_porucha   TEXT NOT NULL DEFAULT '',
  diagnostika         TEXT NOT NULL DEFAULT '',
  odstranenie         TEXT NOT NULL DEFAULT '',
  poznamka            TEXT NOT NULL DEFAULT '',
  material            JSONB NOT NULL DEFAULT '[]',
  ukony               JSONB NOT NULL DEFAULT '[]',
  servisny_vyjazd     NUMERIC(10, 2) NOT NULL DEFAULT 15,
  ico                 TEXT NOT NULL DEFAULT '',
  ic_dph              TEXT NOT NULL DEFAULT '',
  datum_uhrady        DATE,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_opravy_customer_id ON opravy (customer_id);
CREATE INDEX IF NOT EXISTS idx_opravy_datum       ON opravy (datum_vyjazdu);

-- ============================================================
-- ROW LEVEL SECURITY
-- Enable RLS on all tables and allow authenticated users full access.
-- The app uses the service-role key server-side so RLS is bypassed there,
-- but enabling it is good practice.
-- ============================================================

ALTER TABLE kotle      ENABLE ROW LEVEL SECURITY;
ALTER TABLE komponenty ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers  ENABLE ROW LEVEL SECURITY;
ALTER TABLE revizie    ENABLE ROW LEVEL SECURITY;
ALTER TABLE opravy     ENABLE ROW LEVEL SECURITY;

-- Policies: authenticated users can do anything
CREATE POLICY "auth_all_kotle"      ON kotle      FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all_komponenty" ON komponenty FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all_customers"  ON customers  FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all_revizie"    ON revizie    FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all_opravy"     ON opravy     FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Service role bypasses RLS automatically, no extra policies needed for that key.
