-- Migration 012: Reports → Helpdesk (reply threads, attachments, 4-stage status)
-- Run once on production DB before deploying the code changes.
--
-- Turns `reports` from a flat open/closed list into a helpdesk-style reply
-- workflow: 'open' -> 'replied' -> 'waiting' (menunggu user) -> 'done'.
-- ('replied'/'waiting' only apply to source: 'email' reports — enforced in
-- the API layer, not a DB constraint, same as the existing `status` column.)

-- Existing 'closed' rows map straight onto the new terminal state.
UPDATE reports SET status = 'done' WHERE status = 'closed';

-- Reply thread for a report. The report's own `message`/`created_at` stay
-- the thread's first entry (sender 'user') — rows here are every message
-- after that (admin replies today; inbound follow-ups in a future feature).
CREATE TABLE IF NOT EXISTS report_messages (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id         UUID NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
  sender            TEXT NOT NULL, -- 'admin' | 'user'
  body              TEXT NOT NULL,
  email_message_id  TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_report_messages_report_id ON report_messages(report_id);

CREATE TABLE IF NOT EXISTS report_attachments (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id  UUID NOT NULL REFERENCES report_messages(id) ON DELETE CASCADE,
  kind        TEXT NOT NULL, -- 'image' | 'video'
  url         TEXT NOT NULL,
  size_bytes  INTEGER,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_report_attachments_message_id ON report_attachments(message_id);
