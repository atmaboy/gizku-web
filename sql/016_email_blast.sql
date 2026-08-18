-- Migration 016: add email as a third blast notification channel (via Resend)
-- Run once on production DB before deploying the code changes.
--
-- notification_blasts.channel already stored 'push' | 'telegram' as plain text
-- (no CHECK constraint), so 'email' needs no change there. This migration adds:
--   - from_address on notification_blasts: sender identity for email blasts
--     ('support' | 'marketing', see lib/email.ts BLAST_SENDERS). Null for push/telegram.
--   - email on notification_blast_recipients: the literal address targeted for an
--     email-channel recipient, which may not correspond to any users.email row
--     (email blast "specific" targets are raw addresses, not usernames).
-- The existing identity CHECK is widened to also accept an email-only recipient.

ALTER TABLE notification_blasts
  ADD COLUMN IF NOT EXISTS from_address TEXT;

ALTER TABLE notification_blast_recipients
  ADD COLUMN IF NOT EXISTS email TEXT;

DO $$ BEGIN
  ALTER TABLE notification_blast_recipients DROP CONSTRAINT chk_blast_recipients_identity;
EXCEPTION WHEN undefined_object THEN NULL;
END $$;

ALTER TABLE notification_blast_recipients
  ADD CONSTRAINT chk_blast_recipients_identity
  CHECK (user_id IS NOT NULL OR telegram_user_id IS NOT NULL OR email IS NOT NULL);
