-- Migration 020: push token provider (Expo vs FCM langsung)
-- Jalankan sekali di database sebelum deploy (staging dulu, lalu production).
--
-- App Android versi baru mendaftarkan token FCM native supaya blast bisa dikirim langsung lewat
-- FCM v1 (gambar besar di banner). Token Expo lama tetap valid dan terus dikirim lewat Expo Push
-- selama toggle "Jalur Expo (Android)" di backoffice Pengaturan aktif. iOS selalu lewat Expo.

ALTER TABLE push_tokens
  ADD COLUMN IF NOT EXISTS provider TEXT NOT NULL DEFAULT 'expo';  -- 'expo' | 'fcm'
