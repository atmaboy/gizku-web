-- Migration 005: "Request Kenaikan Limit Analisa" feature
-- Run once on production DB before deploying the code changes.
--
-- Adds:
--   limit_tiers    — admin-configurable add-on packages (seeded with 3 defaults below)
--   limit_requests — a user's paid request to raise their daily analysis quota
--
-- Bank account details + the feature kill-switch reuse the existing generic
-- admin_config key/value table (keys: limit_bank_name, limit_bank_account_number,
-- limit_bank_account_holder, limit_feature_enabled) — no new config table needed.

CREATE TABLE IF NOT EXISTS limit_tiers (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  label        TEXT        NOT NULL,
  add_per_day  INT         NOT NULL,
  price        INT         NOT NULL,
  sort_order   INT         NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE limit_tiers IS 'Admin-configurable add-on packages for the daily food-analysis quota (max 10, enforced in app code)';

-- Seed the 3 default tiers, only if the table is still empty (safe to re-run).
INSERT INTO limit_tiers (label, add_per_day, price, sort_order)
SELECT * FROM (VALUES
  ('Tier 1', 3,  30000, 1),
  ('Tier 2', 6,  55000, 2),
  ('Tier 3', 10, 80000, 3)
) AS seed(label, add_per_day, price, sort_order)
WHERE NOT EXISTS (SELECT 1 FROM limit_tiers);

CREATE TABLE IF NOT EXISTS limit_requests (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tier_id          UUID        REFERENCES limit_tiers(id) ON DELETE SET NULL,
  -- Snapshot of the tier at submission time — stays correct even if the
  -- tier is edited/deleted later.
  tier_label       TEXT        NOT NULL,
  add_per_day      INT         NOT NULL,
  total_per_day    INT         NOT NULL,
  price            INT         NOT NULL,
  unique_code      INT         NOT NULL,
  total_transfer   INT         NOT NULL,
  status           TEXT        NOT NULL DEFAULT 'pending', -- 'pending' | 'approved' | 'rejected'
  submitted_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  decided_at       TIMESTAMPTZ,
  proof_image_url  TEXT        NOT NULL,
  note             TEXT,
  reject_reason    TEXT,
  reject_note      TEXT
);

CREATE INDEX IF NOT EXISTS idx_limit_requests_user_id     ON limit_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_limit_requests_status      ON limit_requests(status);
CREATE INDEX IF NOT EXISTS idx_limit_requests_unique_code ON limit_requests(unique_code, status);

COMMENT ON TABLE limit_requests IS 'A user''s request to raise their daily food-analysis quota for 30 days via manual bank transfer, reviewed by an admin';
COMMENT ON COLUMN limit_requests.unique_code IS '3-digit code (100-999) appended as the last 3 digits of total_transfer; must stay unique among non-approved requests';
COMMENT ON COLUMN limit_requests.total_per_day IS 'Snapshot of (floor applying to this user at submission time) + tier.add_per_day';
