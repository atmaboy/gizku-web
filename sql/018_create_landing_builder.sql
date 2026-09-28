-- Migration 018: Landing Builder (draft → publish)
-- Run once on each DB (staging first, then production) BEFORE deploying the
-- code changes. Safe to re-run (IF NOT EXISTS everywhere).
--
-- The whole landing page configuration is stored as ONE JSON document,
-- validated in the app with Zod (lib/landing/schema.ts), in two rows:
--   landing_page(state='draft')     — the only row the backoffice writes to
--                                     (autosave, optimistic lock on `revision`)
--   landing_page(state='published') — the only row visitors read (cached,
--                                     tag 'landing'); "Terbitkan" copies the
--                                     draft here in one transaction.
-- Every publish also appends a snapshot to landing_page_history (rollback
-- copies a snapshot back into the DRAFT, never straight to published).
--
-- No data seeding needed here: the first time an admin opens
-- /admin/landing, the app builds the initial document from the legacy
-- landing_content rows (see lib/landing/legacy.ts) and writes identical
-- draft + published rows. landing_content itself is left untouched as a
-- read-only backup and will be dropped in a later migration.

CREATE TABLE IF NOT EXISTS landing_page (
  state          TEXT        PRIMARY KEY CHECK (state IN ('draft', 'published')),
  content        JSONB       NOT NULL,
  schema_version INTEGER     NOT NULL DEFAULT 1,
  revision       INTEGER     NOT NULL DEFAULT 1,   -- optimistic lock for autosave
  updated_by     TEXT,
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  published_at   TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS landing_page_history (
  id             SERIAL      PRIMARY KEY,
  content        JSONB       NOT NULL,
  schema_version INTEGER     NOT NULL,
  published_by   TEXT,
  published_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  change_summary JSONB                              -- e.g. {"hero":2,"faq":1}
);

CREATE INDEX IF NOT EXISTS idx_landing_history_published_at
  ON landing_page_history (published_at DESC);
