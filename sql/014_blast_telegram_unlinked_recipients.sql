-- Migration 014: allow Telegram blasts to reach unlinked bot users
-- Run once on production DB before deploying the code changes.
--
-- notification_blast_recipients.user_id was NOT NULL, so a blast recipient
-- could only ever be recorded for a Telegram bot user who had also linked
-- a Gizku app account (dispatchTelegramChannel resolved targets through the
-- `users` table). Most Telegram bot users never link, so "Semua User"
-- silently skipped them. Recipients are now identified by whichever of
-- user_id / telegram_user_id applies, so a Telegram blast can target every
-- row in telegram_users regardless of link status.

ALTER TABLE notification_blast_recipients ALTER COLUMN user_id DROP NOT NULL;

ALTER TABLE notification_blast_recipients
  ADD COLUMN IF NOT EXISTS telegram_user_id BIGINT REFERENCES telegram_users(telegram_id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_blast_recipients_telegram_user_id ON notification_blast_recipients(telegram_user_id);

DO $$ BEGIN
  ALTER TABLE notification_blast_recipients
    ADD CONSTRAINT chk_blast_recipients_identity CHECK (user_id IS NOT NULL OR telegram_user_id IS NOT NULL);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
