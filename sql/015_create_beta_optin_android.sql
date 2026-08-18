-- Migration 015: Closed Beta Tester Android Opt-in
-- Run once on production DB before deploying the code changes.
--
-- Adds:
--   users.beta_optin_android / beta_optin_android_at — the user's own
--                          consent to join the Android closed beta tester
--                          program, captured once at registration. Read-only
--                          afterwards — admins can view it but never edit it.
--   beta_optin_config     — singleton: feature on/off switch (hides the
--                          opt-in row on the registration page entirely when
--                          off) + per-language explainer popup content
--                          (title, numbered terms, callout), editable from
--                          the Backoffice.

ALTER TABLE users ADD COLUMN IF NOT EXISTS beta_optin_android BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS beta_optin_android_at TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS beta_optin_config (
  id         SERIAL      PRIMARY KEY,
  enabled    BOOLEAN     NOT NULL DEFAULT FALSE,
  title_id   TEXT        NOT NULL DEFAULT '',
  points_id  TEXT[]      NOT NULL DEFAULT '{}',
  callout_id TEXT        NOT NULL DEFAULT '',
  title_en   TEXT        NOT NULL DEFAULT '',
  points_en  TEXT[]      NOT NULL DEFAULT '{}',
  callout_en TEXT        NOT NULL DEFAULT '',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed the singleton row once, with the same copy already agreed as final
-- (see design handoff), so the popup isn't blank the first time an admin
-- turns the feature on. Ships disabled — an admin must opt in explicitly.
INSERT INTO beta_optin_config (id, enabled, title_id, points_id, callout_id, title_en, points_en, callout_en)
SELECT
  1,
  FALSE,
  'Ikut Closed Beta Tester Android',
  ARRAY[
    'Kamu akan mengikuti program closed tester aplikasi Android Gizku.',
    'Link untuk bergabung ke program tester akan dikirim melalui email yang kamu daftarkan.',
    'Email akun Gizku ini harus sama dengan akun Google Play yang akan dipakai untuk mengunduh aplikasi tester nanti.',
    'Masa uji coba berlangsung selama 14 hari sejak kamu bergabung.'
  ],
  'Pastikan email pendaftaran ini sama persis dengan email akun Google Play kamu — link undangan akan dikirim ke sana.',
  'Join Android Closed Beta Testing',
  ARRAY[
    'You will join the Gizku Android closed tester program.',
    'A link to join the tester program will be sent to your email.',
    'Your Gizku account email must match the Google Play account you will use to download the tester app.',
    'The testing period lasts 14 days after joining.'
  ],
  'Make sure this registration email exactly matches your Google Play account email — the invite link will be sent there.'
WHERE NOT EXISTS (SELECT 1 FROM beta_optin_config);

COMMENT ON TABLE beta_optin_config IS 'Singleton — Closed Beta Tester Android opt-in feature flag + bilingual explainer popup content';
COMMENT ON COLUMN users.beta_optin_android IS 'User consent to join the Android closed beta tester program, captured at registration — not editable by admins';
