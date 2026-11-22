-- Migration 022: meals.scanned_at (waktu scan asli, patokan batas 24 jam ubah tanggal makan)
-- Jalankan sekali di database SEBELUM deploy (staging dulu, lalu production).
-- PENTING: kode baru membaca kolom ini di setiap query meals, jadi deploy tanpa migrasi ini
-- membuat /api/history dan halaman riwayat error.
--
-- logged_at boleh diubah user (mobile, maks. 24 jam setelah scan), scanned_at tidak pernah diubah.
-- Tanpa kolom ini, setelah tanggal diubah sekali, waktu scan asli hilang dan batas 24 jam bisa dilewati.

ALTER TABLE meals ADD COLUMN IF NOT EXISTS scanned_at TIMESTAMPTZ;
UPDATE meals SET scanned_at = logged_at WHERE scanned_at IS NULL;
ALTER TABLE meals ALTER COLUMN scanned_at SET DEFAULT now();
ALTER TABLE meals ALTER COLUMN scanned_at SET NOT NULL;
