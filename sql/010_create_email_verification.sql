-- Migration 010: Email Verification
-- Run once on production DB before deploying the code changes.
--
-- Adds:
--   users.email_verified_at      — NULL until the user clicks a valid link
--   email_verification_tokens    — single-use tokens sent via email on
--                                  register / email change, consumed at
--                                  GET /verify?token=XXX. Only the sha256
--                                  hash of the token is stored, mirroring
--                                  users.password_hash — the raw token only
--                                  ever exists in the emailed link.
--
-- The configurable expiry window (default 72h, max 120h) reuses the existing
-- generic admin_config key/value table (key: email_verification_expiry_hours)
-- — no new config table needed.

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS email_verified_at TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS email_verification_tokens (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash  TEXT        UNIQUE NOT NULL,
  email       TEXT        NOT NULL,
  expires_at  TIMESTAMPTZ NOT NULL,
  consumed_at TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_email_verification_tokens_user_id
  ON email_verification_tokens(user_id);

CREATE INDEX IF NOT EXISTS idx_email_verification_tokens_token_hash
  ON email_verification_tokens(token_hash);

-- Powers the 3-sends-per-24h rate limit check (count rows for a user created
-- within the last 24 hours).
CREATE INDEX IF NOT EXISTS idx_email_verification_tokens_user_created
  ON email_verification_tokens(user_id, created_at);
