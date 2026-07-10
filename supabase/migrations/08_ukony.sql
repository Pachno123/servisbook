-- Shared reference list of servisné úkony (like `komponenty` for materials).
-- Autocomplete in Oprava form suggests from this list; every new úkon typed
-- during save is upserted here so it's remembered for next time.

CREATE TABLE IF NOT EXISTS ukony (
  id SERIAL PRIMARY KEY,
  nazov TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ukony_nazov_lower_idx ON ukony (LOWER(nazov));
