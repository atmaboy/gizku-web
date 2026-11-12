# Gizku Web — aturan kerja

## Release notes wajib di setiap merge ke `main` / deploy production

Merge ke `main` = deploy production (Vercel otomatis). Setiap merge ke `main` WAJIB, dalam
perubahan yang sama (PR / commit yang sama):

1. **Tambah entry baru** di `RELEASES.web` pada `lib/releaseNotes.ts` (terbaru di paling atas):
   `version`, `date` (YYYY-MM-DD), dan `changes` bertipe `feat` | `fix` | `improve` | `chore`.
   Tulis dari sisi dampak ke user/admin, bukan nama file.
2. **Naikkan versi web** di `package.json` (dan 2 baris versi teratas di `package-lock.json`) supaya
   sama persis dengan entry teratas. Aturan semver:
   - `patch` (1.7.3 → 1.7.4): bug fix, perbaikan kecil, tweak copy/UI.
   - `minor` (1.7.3 → 1.8.0): fitur baru atau perubahan perilaku yang kompatibel.
   - `major` (1.7.3 → 2.0.0): breaking change (API tidak kompatibel, migrasi besar).
3. **Perbarui `FEATURES.web`** bila ada fitur yang ditambah, berubah, atau dihapus.
4. Bila perubahan API memengaruhi app mobile (field/param baru, perubahan kontrak), tulis juga
   syaratnya di entry mobile terkait (mis. "butuh backend web ≥ 1.7.3").
5. Jalankan `npm test` — `lib/releaseNotes.test.ts` memeriksa format, urutan versi, dan kesamaan
   versi dengan `package.json`.
6. Perubahan DB yang butuh migrasi SQL manual (`sql/NNN_*.sql`) disebut di entry release notes
   ("jalankan sql/NNN sebelum deploy").

Release notes **mobile** juga dikelola di file yang sama (`RELEASES.mobile`, `FEATURES.mobile`) dan
tampil di backoffice `/admin/releases`. Aturan lengkap sisi mobile ada di `CLAUDE.md` repo gizku-mobile.

Perubahan yang tidak perlu entry: typo di komentar, refactor tanpa efek perilaku, perubahan
dokumentasi/test saja. Kalau ragu, tambahkan entry `chore`.
