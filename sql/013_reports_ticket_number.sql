-- Migration 013: sequential ticket numbers on `reports`
-- Run once on production DB before deploying the code changes.
--
-- Every report (both source: 'app' and 'email') gets a short, sequential,
-- human-facing reference number. For email-sourced reports it's embedded as
-- `[GZK-{n}]` in outbound reply subjects (lib/reportTicket.ts) and parsed
-- back out of inbound replies to match them to the right thread — a
-- deterministic alternative to relying on mail providers to round-trip
-- In-Reply-To/References headers intact.

ALTER TABLE reports ADD COLUMN IF NOT EXISTS ticket_number INTEGER;

-- Backfill existing rows in creation order so old tickets get sensible
-- (still-unique, still-increasing) numbers instead of NULL.
WITH numbered AS (
  SELECT id, row_number() OVER (ORDER BY created_at) AS rn
  FROM reports
  WHERE ticket_number IS NULL
)
UPDATE reports r SET ticket_number = numbered.rn
FROM numbered WHERE r.id = numbered.id;

-- Sequence for all future inserts, continuing from the current max.
CREATE SEQUENCE IF NOT EXISTS reports_ticket_number_seq OWNED BY reports.ticket_number;
SELECT setval('reports_ticket_number_seq', COALESCE((SELECT MAX(ticket_number) FROM reports), 0) + 1, false);
ALTER TABLE reports ALTER COLUMN ticket_number SET DEFAULT nextval('reports_ticket_number_seq');
ALTER TABLE reports ALTER COLUMN ticket_number SET NOT NULL;

DO $$ BEGIN
  ALTER TABLE reports ADD CONSTRAINT reports_ticket_number_unique UNIQUE (ticket_number);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_reports_ticket_number ON reports(ticket_number);
