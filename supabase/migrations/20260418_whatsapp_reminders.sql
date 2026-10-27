-- supabase/migrations/20260418_whatsapp_reminders.sql
--
-- Run once: adds reminder tracking columns to appointments and creates
-- the WhatsApp message delivery log table used by whatsapp-webhook.

-- ── 1. Reminder columns on appointments ──────────────────────────────────────
ALTER TABLE appointments
  ADD COLUMN IF NOT EXISTS reminder_sent    BOOLEAN     NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS reminder_sent_at TIMESTAMPTZ;

-- Index used by the daily cron query (date + status + reminder_sent)
CREATE INDEX IF NOT EXISTS idx_appointments_reminder
  ON appointments (date, status, reminder_sent)
  WHERE status = 'confirmed' AND reminder_sent = FALSE;

-- ── 2. WhatsApp message delivery log ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS whatsapp_message_log (
  message_id  TEXT        PRIMARY KEY,
  status      TEXT        NOT NULL,       -- sent | delivered | read | failed
  updated_at  TIMESTAMPTZ NOT NULL,
  errors      JSONB,
  recipient   TEXT
);

-- Allow the webhook function (service role) to upsert, deny anon reads
ALTER TABLE whatsapp_message_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_all" ON whatsapp_message_log
  FOR ALL
  USING     (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- ── 3. pg_cron job (runs daily at 04:30 UTC = 10:00 IST) ─────────────────────
-- Requires pg_cron extension enabled in Supabase Dashboard → Database → Extensions
--
-- SELECT cron.schedule(
--   'daily-appointment-reminders',
--   '30 4 * * *',
--   $$
--     SELECT net.http_post(
--       url     := current_setting('app.supabase_url') || '/functions/v1/appointment-reminders',
--       headers := jsonb_build_object(
--         'Content-Type',  'application/json',
--         'Authorization', 'Bearer ' || current_setting('app.service_role_key')
--       ),
--       body    := '{}'::jsonb
--     );
--   $$
-- );
