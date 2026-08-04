-- Migration 007: sender's bank name on limit_requests
-- Completes the sender bank details captured at proof-upload time (added in
-- migration 006 for account holder/number) so admins have the sender's
-- bank name too when reconciling incoming transfers.
--
-- Nullable by design, same reasoning as migration 006 — required-ness is
-- enforced at the application layer, not the database, so existing rows
-- (submitted before this shipped) are left as-is.

ALTER TABLE limit_requests
  ADD COLUMN IF NOT EXISTS sender_bank_name TEXT;
