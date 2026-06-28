-- Persist the public URL of the generated protokol PDF so the customer detail
-- screen can show a "Otvoriť PDF" link in history without doing a Storage
-- existence check per row. The URL is only set when the technician used
-- "Uložiť a poslať" (which actually generates + uploads the PDF).

ALTER TABLE revizie ADD COLUMN IF NOT EXISTS protokol_url TEXT;
ALTER TABLE opravy  ADD COLUMN IF NOT EXISTS zaznam_url   TEXT;
