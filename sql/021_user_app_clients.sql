-- Migration 021: versi app, platform, dan terakhir terlihat per user (dilaporkan app mobile)
-- Jalankan sekali di database sebelum deploy (staging dulu, lalu production).
--
-- App mobile 1.2.1+ mengirim header X-App-Version / X-App-Platform / X-App-Build di setiap request dan
-- heartbeat POST /api/auth?action=ping tiap app dibuka. Server mencatat satu baris per
-- (user, platform, versi app) lalu memperbarui last_seen_at (maks. sekali per 5 menit per baris).
-- Versi terbaru yang dipakai user = baris dengan last_seen_at paling baru.

CREATE TABLE IF NOT EXISTS user_app_clients (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  platform      TEXT NOT NULL,   -- 'android' | 'ios'
  app_version   TEXT NOT NULL,   -- semver binary terpasang, mis. '1.2.1'
  app_build     TEXT,            -- versionCode (Android) / buildNumber (iOS)
  first_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_user_app_clients_user_platform_version
  ON user_app_clients (user_id, platform, app_version);
CREATE INDEX IF NOT EXISTS idx_user_app_clients_user_last_seen
  ON user_app_clients (user_id, last_seen_at DESC);
