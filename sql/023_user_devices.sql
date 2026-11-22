-- Migration 023: perangkat per user (dikelompokkan lewat ID instalasi dari app mobile)
-- Jalankan sekali di database sebelum deploy (staging dulu, lalu production).
--
-- App mobile 1.2.1+ membuat ID instalasi acak (UUID) dan mengirimnya di header X-Device-Id.
-- Satu perangkat = satu baris user_devices (versi app terbaru + terakhir terlihat), dan semua push token
-- perangkat itu menunjuk ke device_id yang sama. Token lama tanpa device_id tetap ada (perangkat lama).
-- Kode tetap jalan tanpa migrasi ini (pendaftaran push tidak terganggu), tapi pengelompokan tidak aktif.

CREATE TABLE IF NOT EXISTS user_devices (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  device_id     TEXT NOT NULL,
  platform      TEXT NOT NULL,   -- 'android' | 'ios'
  app_version   TEXT NOT NULL,   -- versi app terbaru yang terlihat di perangkat ini
  app_build     TEXT,
  first_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_user_devices_user_device ON user_devices (user_id, device_id);
CREATE INDEX IF NOT EXISTS idx_user_devices_user_last_seen ON user_devices (user_id, last_seen_at DESC);

ALTER TABLE push_tokens ADD COLUMN IF NOT EXISTS device_id TEXT;
CREATE INDEX IF NOT EXISTS idx_push_tokens_user_device ON push_tokens (user_id, device_id);
