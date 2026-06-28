-- GDPR consent tracking on customers.

ALTER TABLE customers
  ADD COLUMN IF NOT EXISTS gdpr_consent      BOOLEAN     NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS gdpr_consent_date TIMESTAMPTZ;

-- Backfill: customers imported before this column existed kept paper consents.
-- Mark them as consented as of their creation date so the app stops nagging.
UPDATE customers
SET gdpr_consent = TRUE,
    gdpr_consent_date = COALESCE(gdpr_consent_date, created_at)
WHERE gdpr_consent = FALSE;
