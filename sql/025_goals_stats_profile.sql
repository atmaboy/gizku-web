-- Migration 025: Goals & Statistik Nutrisi (profil gender/tanggal lahir, target harian, minat Premium)
-- Jalankan sekali di database SEBELUM deploy (staging dulu, lalu production). Idempoten: aman dijalankan dua kali.
-- PENTING: GET /api/user?action=profile dan /api/stats membaca kolom baru di bawah, jadi deploy tanpa
-- migrasi ini membuat endpoint tersebut error.
--
-- Perubahan:
--   * users.gender ('m'|'f'), users.birth_date: dipakai untuk rata-rata kalori terbakar (AKG Kemenkes 2019).
--   * users.stats_seen_at: badge NEW di tab Statistik app, tersinkron lintas perangkat.
--   * users.premium_until: null = belum Premium. Pembelian belum ada; untuk QA isi manual:
--       UPDATE users SET premium_until = now() + interval '30 days' WHERE username = '...';
--   * user_goals: target kalori & makro harian per user (makro null = pembagian default dari backoffice).
--   * premium_interest_events: klik CTA Premium, "Ingatkan saya" / "Kembali", tap tab Makro terkunci.
--     Status pengingat per user = event remind_yes / remind_no terakhir.

ALTER TABLE users ADD COLUMN IF NOT EXISTS gender TEXT CHECK (gender IN ('m','f'));
ALTER TABLE users ADD COLUMN IF NOT EXISTS birth_date DATE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS stats_seen_at TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS premium_until TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS user_goals (
  user_id     UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  kcal        INTEGER NOT NULL,
  protein_g   INTEGER,
  carbs_g     INTEGER,
  fat_g       INTEGER,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS premium_interest_events (
  id          BIGSERIAL PRIMARY KEY,
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  event       TEXT NOT NULL CHECK (event IN ('cta_click','remind_yes','remind_no','macro_tab_locked')),
  source      TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_pie_user ON premium_interest_events (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pie_event ON premium_interest_events (event, created_at DESC);
