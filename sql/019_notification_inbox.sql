-- Migration 019: inbox notifikasi per user + blast push v2
-- Jalankan sekali di database sebelum deploy kode (staging dulu, lalu production).
--
-- - notification_blasts: konten EN, gambar banner, ikon, tautan tujuan, mode kirim
-- - user_notifications: inbox per user (snapshot konten blast, status dibaca di server)
-- - link_whitelist: domain yang boleh dibuka di webview app (gizku.com default)
-- - push_tokens.language: bahasa app per perangkat, untuk memilih judul/isi push

ALTER TABLE notification_blasts
  ADD COLUMN IF NOT EXISTS title_en   TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS body_en    TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS image_url  TEXT,
  ADD COLUMN IF NOT EXISTS icon_url   TEXT,
  ADD COLUMN IF NOT EXISTS link_type  TEXT NOT NULL DEFAULT 'detail',  -- 'detail' | 'screen' | 'url'
  ADD COLUMN IF NOT EXISTS link_value TEXT,
  ADD COLUMN IF NOT EXISTS delivery   TEXT NOT NULL DEFAULT 'push',    -- 'push' | 'silent'
  ADD COLUMN IF NOT EXISTS failure_reason TEXT;                         -- alasan blast gagal total sebelum kirim

ALTER TABLE push_tokens
  ADD COLUMN IF NOT EXISTS language TEXT NOT NULL DEFAULT 'id';        -- 'id' | 'en'

CREATE TABLE IF NOT EXISTS user_notifications (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  source      TEXT        NOT NULL DEFAULT 'blast',                    -- 'blast' | 'system' (nanti)
  blast_id    UUID        REFERENCES notification_blasts(id) ON DELETE CASCADE,
  title       TEXT        NOT NULL,
  body        TEXT        NOT NULL,
  title_en    TEXT        NOT NULL DEFAULT '',
  body_en     TEXT        NOT NULL DEFAULT '',
  icon_url    TEXT,
  link_type   TEXT        NOT NULL DEFAULT 'detail',
  link_value  TEXT,
  read_at     TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_user_notifications_user_created ON user_notifications (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_notifications_user_unread  ON user_notifications (user_id) WHERE read_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_user_notifications_created      ON user_notifications (created_at);

CREATE TABLE IF NOT EXISTS link_whitelist (
  id                 UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  domain             TEXT        NOT NULL UNIQUE,
  include_subdomains BOOLEAN     NOT NULL DEFAULT FALSE,
  is_default         BOOLEAN     NOT NULL DEFAULT FALSE,
  created_by         TEXT,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);
INSERT INTO link_whitelist (domain, include_subdomains, is_default, created_by)
VALUES ('gizku.com', TRUE, TRUE, 'system')
ON CONFLICT (domain) DO NOTHING;
