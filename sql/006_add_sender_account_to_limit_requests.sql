-- Migration 006: add sender bank account fields to limit_requests
--
-- Captures the sender's declared account holder name and account number
-- (the bank account the transfer was sent FROM) alongside the proof-of-
-- transfer image, so admins can reconcile incoming transfers without having
-- to eyeball the screenshot.
--
-- Nullable at the DB level on purpose — this ALTERs a table that may already
-- have rows from real submissions before this change shipped; those old rows
-- won't have this data and that's expected, no backfill attempted.
-- Required-ness is enforced at the application layer (API + UI), not here.

ALTER TABLE limit_requests
  ADD COLUMN IF NOT EXISTS sender_account_holder TEXT,
  ADD COLUMN IF NOT EXISTS sender_account_number TEXT;
