-- Migration 011: inbound email support tickets on `reports`
-- Run once on production DB before deploying the code changes.
--
-- Lets reports.origin be either the existing in-app feedback form ('app',
-- default — no behavior change for existing rows) or an inbound email to
-- support@... handled by POST /api/webhooks/resend-inbound ('email').
--
-- email_message_id / email_subject are captured now (even though replying
-- isn't implemented yet) so a future in-thread reply feature can set
-- In-Reply-To/References without another migration.

ALTER TABLE reports
  ADD COLUMN IF NOT EXISTS source           TEXT NOT NULL DEFAULT 'app',
  ADD COLUMN IF NOT EXISTS from_email       TEXT,
  ADD COLUMN IF NOT EXISTS email_message_id TEXT,
  ADD COLUMN IF NOT EXISTS email_subject    TEXT;

CREATE INDEX IF NOT EXISTS idx_reports_source ON reports(source);
