-- Migration 009: Legal Document Configuration (backoffice)
-- Run once on production DB before deploying the code changes.
--
-- Adds:
--   legal_document_types — admin-extensible document type registry
--                          (seeded with builtin "terms" and "privacy",
--                          which can never be deleted)
--   legal_documents       — bilingual legal/agreement documents, fetched by
--                          the app via their `slug`. No draft/published
--                          status — every saved row is immediately live.
--   about_content          — singleton: the app's "Tentang Aplikasi" (About)
--                          screen hero description + disclaimer, per language

CREATE TABLE IF NOT EXISTS legal_document_types (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  key        TEXT        UNIQUE NOT NULL,
  label      TEXT        NOT NULL,
  builtin    BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO legal_document_types (key, label, builtin) VALUES
  ('terms',   'Syarat & Ketentuan',  TRUE),
  ('privacy', 'Kebijakan Privasi',   TRUE)
ON CONFLICT (key) DO NOTHING;

CREATE TABLE IF NOT EXISTS legal_documents (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  type_key      TEXT        NOT NULL REFERENCES legal_document_types(key) ON DELETE RESTRICT,
  slug          TEXT        UNIQUE NOT NULL,
  title_id      TEXT        NOT NULL DEFAULT '',
  body_html_id  TEXT        NOT NULL DEFAULT '',
  title_en      TEXT        NOT NULL DEFAULT '',
  body_html_en  TEXT        NOT NULL DEFAULT '',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_legal_documents_type_key ON legal_documents(type_key);
CREATE INDEX IF NOT EXISTS idx_legal_documents_slug     ON legal_documents(slug);

COMMENT ON TABLE legal_documents IS 'Bilingual legal/agreement documents (Terms, Privacy, custom types), fetched globally by slug — no draft/published status, no revision history';
COMMENT ON COLUMN legal_documents.slug IS 'Kebab-case identifier derived from the Indonesian title — the key the app uses to fetch this document';

CREATE TABLE IF NOT EXISTS about_content (
  id              SERIAL      PRIMARY KEY,
  description_id  TEXT        NOT NULL DEFAULT '',
  disclaimer_id   TEXT        NOT NULL DEFAULT '',
  description_en  TEXT        NOT NULL DEFAULT '',
  disclaimer_en   TEXT        NOT NULL DEFAULT '',
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed the singleton row once, with the copy already shipped as static text
-- in the web/mobile apps, so the About screen isn't blank on first load.
INSERT INTO about_content (id, description_id, disclaimer_id, description_en, disclaimer_en)
SELECT
  1,
  'Foto makananmu dan biarkan AI menghitung kalori serta nutrisinya secara instan — tanpa perlu mencatat manual.',
  'Hasil analisa gizi sepenuhnya dihasilkan oleh AI dan dapat mengandung ketidaktepatan. Gunakan sebagai referensi, bukan pengganti nasihat ahli gizi profesional.',
  'Photograph your food and let AI instantly calculate its calories and nutrition — no manual logging needed.',
  'Nutrition analysis results are entirely AI-generated and may contain inaccuracies. Use as a reference, not a substitute for professional nutritionist advice.'
WHERE NOT EXISTS (SELECT 1 FROM about_content);

COMMENT ON TABLE about_content IS 'Singleton — one description + one disclaimer per language, powering the app About screen';
