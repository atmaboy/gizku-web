-- Migration 004: blast notification feature (push + Telegram)
-- Run once on production DB before deploying the code changes

CREATE TABLE IF NOT EXISTS push_tokens (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token        TEXT        NOT NULL UNIQUE,
  platform     TEXT        NOT NULL, -- 'ios' | 'android'
  is_active    BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_push_tokens_user_id ON push_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_push_tokens_active   ON push_tokens(is_active);

COMMENT ON TABLE push_tokens IS 'Expo push tokens registered by the mobile app, one row per device';
COMMENT ON COLUMN push_tokens.token IS 'Expo push token, e.g. ExponentPushToken[xxxx]';

CREATE TABLE IF NOT EXISTS notification_blasts (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_name       TEXT        NOT NULL,
  channel          TEXT        NOT NULL DEFAULT 'push', -- 'push' | 'telegram'
  title            TEXT        NOT NULL DEFAULT '', -- push only; empty string for telegram
  body             TEXT        NOT NULL,
  target_type      TEXT        NOT NULL, -- 'all' | 'specific'
  target_usernames TEXT[],                -- up to 10 usernames, null when target_type = 'all'
  status           TEXT        NOT NULL DEFAULT 'scheduled', -- 'scheduled' | 'sending' | 'completed' | 'cancelled' | 'failed'
  scheduled_at     TIMESTAMPTZ,           -- null = send immediately
  sent_at          TIMESTAMPTZ,
  created_by       TEXT,
  targeted_count   INT         NOT NULL DEFAULT 0,
  sent_count       INT         NOT NULL DEFAULT 0,
  clicked_count    INT         NOT NULL DEFAULT 0,
  read_count       INT         NOT NULL DEFAULT 0,
  failed_count     INT         NOT NULL DEFAULT 0,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Patches for tables created by an earlier revision of this migration
-- (CREATE TABLE IF NOT EXISTS above is a no-op if the table already exists,
-- so these columns need to be added separately for a safe re-run).
ALTER TABLE notification_blasts ADD COLUMN IF NOT EXISTS channel TEXT NOT NULL DEFAULT 'push';
ALTER TABLE notification_blasts ALTER COLUMN title SET DEFAULT '';
UPDATE notification_blasts SET title = '' WHERE title IS NULL;
ALTER TABLE notification_blasts ALTER COLUMN title SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_notification_blasts_status       ON notification_blasts(status);
CREATE INDEX IF NOT EXISTS idx_notification_blasts_scheduled_at ON notification_blasts(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_notification_blasts_channel      ON notification_blasts(channel);

COMMENT ON TABLE notification_blasts IS 'A blast notification batch composed and sent from the admin backoffice, over push or Telegram';
COMMENT ON COLUMN notification_blasts.batch_name IS 'Internal-only name for searching batch history, never shown to end users';

CREATE TABLE IF NOT EXISTS notification_blast_recipients (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  blast_id      UUID        NOT NULL REFERENCES notification_blasts(id) ON DELETE CASCADE,
  user_id       UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  push_token_id UUID        REFERENCES push_tokens(id) ON DELETE SET NULL,
  provider      TEXT,       -- 'fcm' | 'apns' | 'telegram'
  status        TEXT        NOT NULL DEFAULT 'pending', -- 'pending' | 'sent' | 'failed' | 'clicked' | 'read'
  error_message TEXT,
  sent_at       TIMESTAMPTZ,
  clicked_at    TIMESTAMPTZ,
  read_at       TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Patch for tables created by an earlier revision of this migration (see note above).
ALTER TABLE notification_blast_recipients ADD COLUMN IF NOT EXISTS provider TEXT;

CREATE INDEX IF NOT EXISTS idx_blast_recipients_blast_id ON notification_blast_recipients(blast_id);
CREATE INDEX IF NOT EXISTS idx_blast_recipients_user_id  ON notification_blast_recipients(user_id);
CREATE INDEX IF NOT EXISTS idx_blast_recipients_status   ON notification_blast_recipients(blast_id, status);

COMMENT ON TABLE notification_blast_recipients IS 'Per-recipient delivery status for a notification blast';
