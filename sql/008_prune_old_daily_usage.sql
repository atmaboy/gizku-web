-- Migration 008: one-time cleanup of daily_usage rows older than the new
-- 90-day retention window (see USAGE_RETENTION_DAYS in lib/limitLedger.ts).
--
-- Going forward this is handled automatically every day by the
-- /api/cron/prune-old-usage cron job — this migration just catches up
-- whatever's already sitting in the table older than 90 days, so
-- production doesn't have to wait for tonight's cron run.
--
-- Only touches daily_usage (pure usage telemetry feeding the "Riwayat
-- Limit" ledger's usage-event history). Does NOT touch limit_requests —
-- those are financial/approval records and are kept indefinitely.

DELETE FROM daily_usage WHERE date < (CURRENT_DATE - INTERVAL '90 days');
