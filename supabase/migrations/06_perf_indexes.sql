-- ============================================================
-- Performance indexes
-- ------------------------------------------------------------
-- 1) Composite index for the "latest revízia per customer" query
--    used by /api/revizie/latest-per-customer. Without it, Postgres
--    scans the full revizie table on every customer-list load.
-- 2) Composite (company_id, datum) speeds up the /api/stats query
--    which scans by company_id then filters by year on `datum`.
-- 3) Same for opravy.
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_revizie_customer_datum
  ON revizie (customer_id, datum DESC);

CREATE INDEX IF NOT EXISTS idx_revizie_company_datum
  ON revizie (company_id, datum DESC);

CREATE INDEX IF NOT EXISTS idx_opravy_company_datum
  ON opravy (company_id, datum_vyjazdu DESC);
