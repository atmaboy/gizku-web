-- Migration 017: add image_hash to meals for duplicate-submission dedup
-- Run once on production DB before deploying the code changes.
--
-- Guards against the same photo being saved more than once when a single
-- capture action fires more than one analyze/save request (e.g. a WebView
-- <input type="file"> change event firing twice). POST /api/analyze and
-- POST /api/history use (user_id, image_hash) to detect a duplicate within
-- a short time window and short-circuit instead of calling Claude again /
-- inserting a new row.

ALTER TABLE meals
  ADD COLUMN IF NOT EXISTS image_hash TEXT;

CREATE INDEX IF NOT EXISTS idx_meals_user_hash ON meals(user_id, image_hash);
