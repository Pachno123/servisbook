-- Track when reminder emails were sent and customer's response.
-- Adds visibility for the technician/admin into the 11-month reminder flow.

ALTER TABLE revizie
  ADD COLUMN IF NOT EXISTS reminder_sent_at      TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS reminder_response     TEXT CHECK (reminder_response IN ('yes','no')),
  ADD COLUMN IF NOT EXISTS reminder_response_at  TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_revizie_reminder_sent_at ON revizie (reminder_sent_at DESC);

-- Backfill: any revízia previously marked reminder_sent=true gets sent_at = now()
-- so the log isn't empty for older sends (best-effort, real timestamp is lost).
UPDATE revizie
SET reminder_sent_at = COALESCE(reminder_sent_at, NOW())
WHERE reminder_sent = TRUE AND reminder_sent_at IS NULL;
