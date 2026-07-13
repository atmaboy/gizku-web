-- Migration 003: allow mobile app sources in meals.source check constraint
-- Run this manually in Supabase SQL Editor (production)
-- Date: 2026-07-13
--
-- POST /api/history accepts source = 'app-ios' | 'app-android' from the mobile
-- app (see app/api/history/route.ts ALLOWED_CLIENT_SOURCES), but the
-- meals_source_check constraint was never updated to allow these values.
-- Every mobile save has been failing with:
--   error: new row for relation "meals" violates check constraint "meals_source_check"

ALTER TABLE meals DROP CONSTRAINT IF EXISTS meals_source_check;

ALTER TABLE meals ADD CONSTRAINT meals_source_check
  CHECK (source IN ('web', 'telegram', 'app-ios', 'app-android'));
