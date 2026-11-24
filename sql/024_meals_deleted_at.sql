-- Migration 024: meals.deleted_at (soft delete riwayat makanan)
-- Jalankan sekali di database SEBELUM deploy (staging dulu, lalu production).
-- PENTING: kode baru membaca/memfilter kolom ini di setiap query meals, jadi deploy tanpa migrasi ini
-- membuat /api/history, halaman riwayat, dan dashboard admin error.
--
-- Saat user menghapus riwayat, baris tidak lagi di-DELETE tetapi diberi deleted_at. Backoffice
-- menampilkannya dengan ikon "dihapus"; semua hitungan (kalori user, statistik, dashboard) mengabaikannya.
-- Baris yang sudah dihapus sebelum migrasi ini sudah hilang permanen dan tidak bisa dipulihkan.
-- Cron /api/cron/prune-deleted-meals menghapus permanen baris yang deleted_at-nya > 90 hari.

ALTER TABLE meals ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
CREATE INDEX IF NOT EXISTS idx_meals_deleted_at ON meals (deleted_at) WHERE deleted_at IS NOT NULL;
