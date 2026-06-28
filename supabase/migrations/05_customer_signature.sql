-- Stores the customer's GDPR consent signature (PNG data URL).
ALTER TABLE customers
  ADD COLUMN IF NOT EXISTS gdpr_signature TEXT;
