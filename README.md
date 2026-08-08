# 🥗 Gizku

> Aplikasi pelacak nutrisi makanan berbasis AI — analisa foto makananmu dan catat asupan harian dengan mudah.

[![Next.js](https://img.shields.io/badge/Next.js-15-black?logo=next.js)](https://nextjs.org)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3ECF8E?logo=supabase)](https://supabase.com)
[![Deployed on Vercel](https://img.shields.io/badge/Deployed%20on-Vercel-black?logo=vercel)](https://vercel.com)
[![License](https://img.shields.io/badge/license-Private-red)](#)

> ⚠️ **Catatan Rebrand:** Aplikasi ini sebelumnya bernama **NutriLog**. Per Mei 2026, nama resmi telah berganti menjadi **Gizku**. Beberapa nama internal (cookie `nl_token`, tabel/kolom, pesan default) masih menyisakan prefix `nl_` / `NutriLog` dari versi lama.

Backend ini juga menjadi **satu-satunya API** untuk [gizku-mobile](https://github.com/atmaboy/gizku-mobile) (aplikasi iOS & Android) — tidak ada backend terpisah untuk mobile.

---

## ✨ Fitur Utama

### 👤 Pengguna
- 📷 **Analisa foto makanan** — upload foto atau ambil dari kamera, AI (Anthropic Claude) mendeteksi nama makanan beserta kalori, protein, karbohidrat, dan lemak; kuota harian dipotong hanya jika analisa berhasil
- 📊 **Riwayat & statistik** — rekap harian/mingguan, ringkasan nutrisi per hari, edit hasil analisa
- 🔐 **Autentikasi** — login/register dengan JWT custom (tanpa NextAuth), wajib centang persetujuan Syarat & Ketentuan + Kebijakan Privasi saat register
- 🔑 **Reset & ubah password, ubah email** — dari halaman Settings; admin juga bisa reset password user (memaksa ganti password di login berikutnya)
- 🌐 **Dwibahasa (Indonesia/English)** — seluruh UI pengguna, hasil analisa AI, dan konten legal bisa ditampilkan dalam dua bahasa, tersimpan di `localStorage`
- 💳 **Request Kenaikan Limit Analisa** — user mengajukan penambahan kuota harian lewat transfer bank manual (paket/tier, kode unik nominal transfer, upload bukti transfer), dengan riwayat status & ledger penggunaan
- ✈️ **Integrasi Telegram Bot** — hubungkan akun via kode OTP 6 digit, lalu kirim foto makanan langsung ke bot untuk dianalisa dan otomatis tercatat ke riwayat
- 📄 **Halaman legal publik** (`/legal/[slug]`) — Syarat & Ketentuan, Kebijakan Privasi, dan dokumen custom lain, dwibahasa
- 🔧 **Maintenance mode aware** — user aktif otomatis logout & diarahkan ke halaman maintenance saat mode pemeliharaan aktif
- 🧪 **Staging banner** — banner kuning yang menandai environment staging (non-production), menampilkan project ref Supabase yang sedang dipakai

### 🛠️ Admin / Backoffice
- 📊 **Dashboard admin** — statistik ringkasan & recent users
- 👥 **Manajemen user** — CRUD, aktif/nonaktif, ubah daily limit, reset password (dengan audit trail siapa & kapan)
- 🖼️ **Landing Page CMS** — seluruh konten landing page (hero, how it works, features, stats, CTA) dikonfigurasi tanpa deploy ulang, termasuk upload hero image ke Supabase Storage
- 🦶 **Footer CMS** — kelola grup & link footer, urutan tampil, aktif/nonaktif per item
- 📜 **Legal Document Configuration** — rich text editor (bold/italic/heading/list) dwibahasa untuk Syarat & Ketentuan, Kebijakan Privasi, dan tipe dokumen custom; output disanitasi (allowlist tag) sebelum disimpan
- 💳 **Review Request Kenaikan Limit** — approve/reject pengajuan user (dengan alasan reject terstruktur), konfigurasi tier paket & rekening bank tujuan transfer
- 📣 **Notification Blast** — kirim broadcast lewat **push notification** (Expo → FCM/APNs) atau **Telegram**, ke seluruh user atau user tertentu (maks. 10 username), bisa dijadwalkan; tracking terkirim/diklik/dibaca/gagal per penerima
- 🤖 **Konfigurasi & statistik Bot Telegram** — atur bot dari backoffice, lihat statistik pemakaian
- 📝 **Laporan & Helpdesk** — kelola laporan dari dalam aplikasi maupun inbound email (support@...) dalam satu inbox: balas laporan berbasis email langsung dari backoffice (thread berbalas, lampiran foto/video, threading `In-Reply-To`/`References`), pipeline status 4 tahap (Open/Dibalas/Menunggu user/Selesai), pencarian & filter
- 🔧 **Maintenance mode** — aktifkan/nonaktifkan mode pemeliharaan aplikasi

### ⚙️ Infrastruktur
- 🗄️ **Supabase** — database PostgreSQL utama (via Drizzle ORM) sekaligus Supabase Storage untuk file upload (hero image, bukti transfer limit, dll)
- ⏱️ **Cron job** — `send-scheduled-blasts` (setiap hari 00:00) mengirim blast terjadwal; `prune-old-usage` (setiap hari 03:00) membersihkan data telemetri `daily_usage` yang sudah lewat masa retensi. Dikonfigurasi di `vercel.json`, tapi **dipicu lewat [cron-job.org](https://cron-job.org)** (bukan Vercel Cron bawaan) selama project masih di plan Vercel **Hobby** (gratis) — lihat catatan di bagian [`/api/cron/*`](#apicron-dipicu-eksternal)
- 📈 **Vercel Analytics & Speed Insights** — tracking page view dan web vitals otomatis
- 🌐 **CORS global** — di-inject lewat middleware untuk semua route `/api/*`, agar bisa diakses dari aplikasi mobile

---

## 🗂️ Struktur Direktori

```
gizku-web/
│
├── app/                              # Next.js App Router
│   ├── layout.tsx                    # Root layout — font, Toaster, Vercel Analytics/Speed Insights
│   ├── page.tsx                      # Landing page publik (hero, features, how it works, CTA)
│   ├── globals.css                   # CSS variables (dark/light theme tokens)
│   ├── legal/[slug]/page.tsx         # Halaman legal publik (Syarat & Ketentuan, Privasi, dokumen custom)
│   │
│   ├── login/page.tsx                # Login & register; consent checkbox, banner maintenance, BrandAnnouncement
│   ├── settings/page.tsx             # Redirect helper ke /main/settings
│   │
│   ├── main/                         # Aplikasi utama (user login)
│   │   ├── layout.tsx                # Header, bottom nav, auto-logout maintenance
│   │   ├── riwayat/
│   │   │   ├── page.tsx              # Daftar meal & ringkasan nutrisi harian
│   │   │   └── [id]/page.tsx         # Detail satu catatan makan
│   │   ├── limit/
│   │   │   ├── page.tsx              # Request Kenaikan Limit — pilih tier, ajukan
│   │   │   ├── new/page.tsx          # Form pengajuan baru (kode unik, upload bukti transfer)
│   │   │   ├── [id]/page.tsx         # Detail status pengajuan
│   │   │   └── riwayat/page.tsx      # Riwayat/ledger penggunaan & reset limit
│   │   ├── settings/
│   │   │   ├── page.tsx              # Menu pengaturan
│   │   │   ├── change-password/page.tsx
│   │   │   ├── change-email/page.tsx
│   │   │   ├── telegram/page.tsx     # Hubungkan/putuskan akun Telegram
│   │   │   ├── language/page.tsx     # Ganti bahasa ID/EN
│   │   │   ├── feedback/page.tsx     # Kirim laporan/masukan
│   │   │   └── about/page.tsx        # Tentang aplikasi
│   │   └── force-change-password/page.tsx  # Wajib ganti password (setelah admin reset)
│   │
│   ├── admin/                        # Backoffice (guard via middleware, cookie nl_admin_token)
│   │   ├── layout.tsx                # Shell admin (sidebar, nav progress)
│   │   ├── login/page.tsx
│   │   ├── page.tsx                  # Dashboard — statistik & recent users
│   │   ├── users/page.tsx            # Manajemen user — CRUD, reset password, audit trail
│   │   ├── reports/page.tsx          # Laporan masukan user
│   │   ├── config/page.tsx           # Konfigurasi global (daily limit, maintenance, API key)
│   │   ├── landing/page.tsx          # Editor landing page CMS
│   │   ├── footer/page.tsx           # Editor footer CMS
│   │   ├── legal/page.tsx            # Legal Document Configuration (RTE dwibahasa)
│   │   ├── limit/page.tsx            # Review pengajuan limit, konfigurasi tier & rekening
│   │   ├── telegram/page.tsx         # Konfigurasi & statistik bot Telegram
│   │   └── blast/
│   │       ├── page.tsx              # Daftar & status notification blast
│   │       ├── new/page.tsx          # Compose blast baru (push/telegram, target, jadwal)
│   │       └── [id]/page.tsx         # Detail blast — daftar penerima & status delivery
│   │
│   ├── maintenance/                  # Halaman maintenance (fallback statis)
│   │   ├── page.tsx
│   │   └── MaintenanceView.tsx
│   │
│   └── api/                          # API Routes (Next.js Route Handlers)
│       ├── auth/route.ts             # POST login, register, verify, change_password, reset_password
│       ├── analyze/route.ts          # POST analisa gambar makanan via Anthropic Claude
│       ├── history/route.ts          # GET/POST/PATCH/DELETE riwayat meal; GET today summary
│       ├── user/route.ts             # GET profil user; POST change_password, update_email
│       ├── report/route.ts           # POST kirim laporan; GET laporan milik user
│       ├── maintenance/route.ts      # GET status maintenance mode (publik)
│       ├── announcement/route.ts     # GET/POST status BrandAnnouncement (dismiss tracking)
│       ├── landing-content/route.ts  # GET konten landing page (publik)
│       ├── footer-content/route.ts   # GET konten footer (publik)
│       ├── legal-content/route.ts    # GET seluruh dokumen legal + about content (publik)
│       ├── limit/route.ts            # GET config/summary/requests/ledger; POST reserve_code, submit_request
│       ├── push/route.ts             # POST register/unregister push token, ack notifikasi
│       ├── telegram/
│       │   ├── link/route.ts         # POST generate token link; DELETE putus hubungan
│       │   ├── verify/route.ts       # GET dipanggil bot untuk verifikasi & link akun
│       │   └── webhook/route.ts      # POST webhook Telegram (pesan masuk ke bot)
│       ├── cron/
│       │   ├── send-scheduled-blasts/route.ts  # GET (dipicu cron-job.org) kirim blast terjadwal
│       │   └── prune-old-usage/route.ts        # GET (dipicu cron-job.org) bersihkan daily_usage lama
│       └── admin/
│           ├── route.ts              # Login/logout admin; CRUD user, config, maintenance, laporan
│           ├── upload-image/route.ts # POST upload hero image ke Supabase Storage
│           ├── delete-image/route.ts # POST hapus hero image
│           ├── migrate/route.ts      # POST migrasi data lama dari Supabase KV → PostgreSQL
│           ├── landing/route.ts      # CRUD konten landing page
│           ├── footer/route.ts       # CRUD konten footer
│           ├── legal/route.ts        # CRUD dokumen & tipe dokumen legal, about content
│           ├── limit/route.ts        # Review pengajuan limit, konfigurasi tier & bank
│           ├── blast/route.ts        # CRUD notification blast, estimasi target, cek delivery receipt
│           ├── telegram/
│           │   ├── config/route.ts   # GET/POST konfigurasi bot Telegram
│           │   └── stats/route.ts    # GET statistik pemakaian bot
│           └── users/[userId]/meals/route.ts  # GET riwayat meal milik satu user (untuk admin)
│
├── components/                       # Shared React components
│   ├── GizkuLogo.tsx                 # Komponen logo terpusat (progress ring + pie mark SVG)
│   ├── BrandAnnouncement.tsx         # Widget notifikasi rebrand NutriLog → Gizku (dismissible)
│   ├── StagingBanner.tsx             # Banner peringatan environment staging
│   ├── LegalConsentCheckbox.tsx      # Checkbox wajib setuju T&C/Privasi saat register
│   ├── capture/                      # Context/provider alur capture & analisa foto
│   ├── ui/                           # Primitive UI (Button, Card, TextField, Dialog, BottomNav, icons, dll)
│   └── admin/                        # Komponen khusus backoffice (sidebar, RTE, modal riwayat meal, dll)
│
├── drizzle/
│   └── schema.ts                     # Drizzle ORM schema — seluruh tabel PostgreSQL & relasinya
│
├── lib/
│   ├── auth.ts                       # JWT sign/verify, hashPassword, extractToken
│   ├── admin.ts                      # Helper admin — requireAdmin guard, getCfg/setCfg (admin_config)
│   ├── db.ts                         # Drizzle client (koneksi ke Supabase PostgreSQL)
│   ├── supabase-storage.ts           # Upload & delete file via Supabase Storage (service_role)
│   ├── maintenance.ts                # Cek status maintenance (cached 10 detik)
│   ├── limit.ts                      # Helper "Request Kenaikan Limit" — tier, kode unik, bank config
│   ├── limitLedger.ts                # Algoritma ledger limit (usage/reset) — sumber tunggal, dipakai user & admin
│   ├── limitReasons.ts               # Konstanta alasan reject pengajuan limit
│   ├── legal.ts                      # Slugify & sanitizer HTML (allowlist tag) untuk dokumen legal
│   ├── legalContent.ts               # Client helper fetch /api/legal-content
│   ├── blast.ts                      # Kirim push (Expo Push API) & Telegram, cek delivery receipt
│   ├── bot.ts                        # Logika bot Telegram (grammY) — /start, /help, /today, /link, foto
│   ├── i18n/
│   │   ├── LanguageContext.tsx       # Context provider bahasa ID/EN
│   │   ├── translations.ts           # Dictionary terjemahan
│   │   └── localizedAnalysis.ts      # Terjemahan hasil analisa AI & ledger title per bahasa
│   └── utils.ts                      # Helper: setCors, ok/err response, fmtDate, todayISO, dll
│
├── sql/                              # Migration SQL berurutan (referensi, dijalankan manual di Supabase)
├── public/                           # Static assets (favicon, manifest.json, icons)
│
├── middleware.ts                     # Edge middleware — guard admin, redirect maintenance, inject CORS
├── vercel.json                       # Referensi jadwal cron (send-scheduled-blasts, prune-old-usage) — pemicu aktual: cron-job.org
├── drizzle.config.ts                 # Konfigurasi Drizzle Kit
├── next.config.ts                    # Konfigurasi Next.js
├── tailwind.config.ts                # Konfigurasi Tailwind CSS
├── .env.example                      # Template environment variables
└── package.json                      # Dependencies & scripts
```

---

## ⚙️ Environment Variables

Salin `.env.example` ke `.env.local` lalu isi nilai yang sesuai:

```bash
cp .env.example .env.local
```

| Variable | Keterangan |
|---|---|
| `DATABASE_URL` | Connection string PostgreSQL Supabase (mode Transaction, port `6543` — wajib untuk Vercel serverless) |
| `SUPABASE_URL` | URL project Supabase, dipakai fitur migrasi data lama & Supabase Storage |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key Supabase (migrasi data & upload storage) |
| `NEXT_PUBLIC_SUPABASE_URL` | URL publik Supabase — dipakai `StagingBanner` untuk menampilkan project ref yang aktif |
| `JWT_SECRET` | Secret key untuk signing JWT (min. 32 karakter) |
| `ADMIN_DEFAULT_PASSWORD` | Password default akun admin saat pertama kali login (default: `Admin1234!` jika tidak diset) |
| `ANTHROPIC_API_KEY` | API key Anthropic Claude untuk analisa gambar (bisa juga diset dari panel admin) |
| `TELEGRAM_BOT_TOKEN` | Token bot Telegram (dari [@BotFather](https://t.me/BotFather)) |
| `TELEGRAM_WEBHOOK_SECRET` | Secret untuk memvalidasi webhook Telegram masuk |
| `TELEGRAM_BOT_USERNAME` | Username bot (untuk membuat deep-link `t.me/<username>?start=link_XXX`) |
| `TELEGRAM_WHITELIST_ENABLED` | `true` untuk membatasi bot hanya ke ID tertentu — **hanya untuk dev/staging**, tanpa efek di production |
| `TELEGRAM_WHITELIST_IDS` | Daftar Telegram user ID yang diizinkan (comma-separated), dipakai jika whitelist aktif |
| `EXPO_ACCESS_TOKEN` | Opsional — hanya diperlukan jika project Expo mengaktifkan "Enhanced Security" untuk push notification |
| `CRON_SECRET` | Melindungi endpoint `/api/cron/*` dari akses publik; diset sebagai `Authorization: Bearer <CRON_SECRET>` di job cron-job.org (lihat [Cara Deploy](#cara-deploy-ke-vercel)) |
| `NEXT_PUBLIC_APP_ENV` | Set ke `staging` atau `preview` di environment non-production agar `StagingBanner` tampil |

---

## 🔌 API Reference

### Konvensi Umum

- **Response sukses**: objek data mentah langsung di top-level (tidak dibungkus).
  ```json
  { "token": "eyJ...", "user": { "id": "uuid", "username": "atmaklasik" } }
  ```
- **Response error**: `{ "error": "Pesan error" }`. Untuk error `503` akibat maintenance mode, ditambahkan field `maintenance`:
  ```json
  { "ok": false, "error": "...", "maintenance": { "title": "...", "description": "..." } }
  ```
- Sebagian endpoint (mis. `/api/limit`) menambahkan field `data` terstruktur pada error tertentu, contoh saat kode unik transfer sudah dipakai user lain:
  ```json
  { "error": "code_taken", "data": { "uniqueCode": 123, "totalTransfer": 45123 } }
  ```

**Authentication header** (wajib untuk semua endpoint kecuali yang ditandai publik):
```
Authorization: Bearer <jwt_token>
```
Endpoint admin memakai token admin terpisah (cookie `nl_admin_token`, HttpOnly, 4 jam), lihat bagian [Admin API](#api-admin).

---

### HTTP Status Code

| Code | Arti | Kapan Muncul |
|------|------|--------------|
| `200` | OK | Request berhasil |
| `204` | No Content | CORS preflight (OPTIONS) |
| `400` | Bad Request | Body/parameter tidak valid atau tidak lengkap |
| `401` | Unauthorized | Token tidak ada, tidak valid, atau kadaluarsa |
| `403` | Forbidden | Akun tidak aktif (dinonaktifkan admin) |
| `404` | Not Found | Resource tidak ditemukan |
| `409` | Conflict | Data sudah ada (username/email duplikat) |
| `422` | Unprocessable Entity | Gambar tidak mengandung makanan |
| `429` | Too Many Requests | Batas analisa harian tercapai, atau rate limit Anthropic |
| `500` | Internal Server Error | Error tak terduga di server |
| `503` | Service Unavailable | AI overload, API key tidak valid, atau maintenance mode aktif |

---

### `/api/auth` (publik)

| Method | Action | Keterangan |
|---|---|---|
| `POST` | `?action=register` | Daftar akun baru. Body: `{ username, password, email }`. `409` jika username/email sudah dipakai. |
| `POST` | `?action=login` | Login, dapatkan JWT. Body: `{ username, password }`. Response menyertakan `mustChangePassword: true` jika admin baru saja reset password user → client wajib redirect ke `/main/force-change-password`. |
| `POST` | `?action=verify` | Validasi token tersimpan di client. Header `Authorization` wajib. |
| `POST` | `?action=change_password` | Ganti password user login. Body: `{ newPassword, currentPassword? }` — `currentPassword` opsional untuk alur force-change. |
| `POST` | `?action=reset_password` | Reset password tanpa login (lupa password), verifikasi via username. |

**Response 200 login (contoh):**
```json
{
  "token": "eyJ...",
  "user": { "id": "uuid", "username": "atmaklasik", "dailyLimit": 5 }
}
```

---

### `/api/analyze`

`POST` — Analisa gambar makanan menggunakan Anthropic Claude Vision. Kuota harian dikurangi **hanya jika analisa berhasil**.

**Header:** `Authorization: Bearer <token>`

**Body (JSON):** `{ image: base64_string, mimeType: "image/jpeg", correction?: string }` — `correction` opsional untuk re-analisa berdasarkan koreksi teks dari user.

**Response Codes:** `200` sukses · `400` gambar tidak dikirim/format tidak didukung · `401` token tidak valid · `422` gambar bukan makanan/minuman · `429` limit tercapai/rate limit Anthropic · `503` AI overload/API key salah/maintenance · `500` error tak terduga.

**Response 200:**
```json
{
  "analysis": {
    "dishes": [{ "name": "Nasi Goreng", "portion": "1 piring", "calories": 450, "protein": 12.5, "carbs": 65.0, "fat": 15.0 }],
    "total": { "calories": 450, "protein": 12.5, "carbs": 65.0, "fat": 15.0 },
    "notes": "Kandungan karbohidrat tinggi",
    "healthScore": 6,
    "assessment": "Makanan cukup bergizi namun tinggi kalori."
  },
  "usage": { "used": 2, "limit": 5, "remaining": 3 }
}
```

---

### `/api/history`

| Method | Action | Keterangan |
|---|---|---|
| `GET` | `?action=list&page=&per_page=` | Riwayat meal dengan pagination (default `page=1`, `per_page=10`) |
| `GET` | `?action=today` | Ringkasan nutrisi hari ini + status kuota |
| `GET` | `?action=delete&id=` | *(lihat juga `DELETE` di bawah)* |
| `POST` | — | Simpan hasil analisa sebagai entri riwayat. Body: `{ analysis, imageDataUrl }` |
| `PATCH` | — | Edit entri riwayat (koreksi manual nutrisi/deskripsi). Body: `{ id, ...field yang diubah }` |
| `DELETE` | `?id=<meal_id>` | Hapus satu entri riwayat milik user login |

**Response 200 `?action=today`:**
```json
{
  "meals": [],
  "summary": { "totalCalories": 850, "totalProtein": 35.0, "totalCarbs": 110.0, "totalFat": 28.0 },
  "usage": { "used": 3, "limit": 5, "remaining": 2 }
}
```

---

### `/api/user`

| Method | Action | Keterangan |
|---|---|---|
| `GET` | `?action=profile` | Ambil data profil user login |
| `POST` | `?action=change_password` | Ganti password (setara `/api/auth?action=change_password`) |
| `POST` | `?action=update_email` | Ubah email user. Body: `{ email }` |

---

### `/api/limit` — Request Kenaikan Limit Analisa

| Method | Action | Keterangan |
|---|---|---|
| `GET` | `?action=config` | Feature flag, daftar tier (dengan `totalPerDay` khusus user ini), info rekening bank tujuan |
| `GET` | `?action=summary` | Ringkasan untuk kartu Settings: `dailyLimit`/`used`/`remaining`/tier aktif |
| `GET` | `?action=requests` | Daftar pengajuan milik user, terbaru dulu |
| `GET` | `?action=request&id=` | Detail satu pengajuan (harus milik user login) |
| `GET` | `?action=ledger&page=&pageSize=` | Riwayat ledger penggunaan/reset, terbaru dulu (maks. 10/halaman) |
| `POST` | `{ action: 'reserve_code', tierId }` | Hitung kode unik nominal transfer (murni komputasi, belum disimpan) |
| `POST` | `{ action: 'submit_request', tierId, uniqueCode, proofImageUrl, senderAccountHolder, senderAccountNumber, senderBankName, note? }` | Ajukan permintaan baru (status `pending`) |

Alur singkat: user pilih tier → `reserve_code` menghasilkan nominal transfer unik agar mudah direkonsiliasi admin → user transfer manual & upload bukti → `submit_request` → admin approve/reject di backoffice → jika approve, limit harian bertambah selama periode tier (30 hari), tercatat di ledger.

---

### `/api/telegram`

| Endpoint | Method | Keterangan |
|---|---|---|
| `/api/telegram/link` | `POST` | Generate token OTP 6 karakter untuk menghubungkan akun (dipakai halaman Settings → Telegram) |
| `/api/telegram/link` | `DELETE` | Putuskan hubungan akun Telegram |
| `/api/telegram/verify` | `GET` | Dipanggil oleh bot setelah user kirim `/link <token>` — mem-verifikasi & menghubungkan akun, lalu menghapus token |
| `/api/telegram/webhook` | `POST` | Webhook Telegram — menerima pesan masuk ke bot (foto, `/start`, `/help`, `/today`, `/link`) |

Flow linking: **Settings → Hubungkan Telegram** (web/mobile) → dapat kode 6 digit → user kirim `/link <kode>` ke bot atau buka deep-link `t.me/<bot>?start=link_<kode>` → bot verifikasi ke `/api/telegram/verify` → akun terhubung, foto yang dikirim ke bot otomatis tercatat sebagai meal dengan `source = 'telegram'`.

---

### `/api/push`

`POST` — semua aksi butuh `Authorization: Bearer <token>`, dipakai aplikasi mobile untuk mendaftarkan Expo push token.

| Action | Body | Keterangan |
|---|---|---|
| `register` | `{ token, platform }` | Daftarkan/refresh Expo push token perangkat |
| `unregister` | `{ token }` | Hapus/nonaktifkan push token (mis. saat logout) |
| `ack` | `{ blastId, event }` | `event`: `'clicked'` atau `'read'` — catat interaksi user pada notifikasi blast |

---

### `/api/landing-content`, `/api/footer-content`, `/api/legal-content`, `/api/announcement`, `/api/maintenance`

Endpoint publik (tanpa autentikasi), sumber konten CMS untuk halaman publik:

| Endpoint | Method | Keterangan |
|---|---|---|
| `/api/landing-content` | `GET` | Seluruh konten landing page (hero, how_it_works, features, stats, CTA) |
| `/api/footer-content` | `GET` | Grup & link footer aktif, terurut |
| `/api/legal-content` | `GET` | Semua dokumen legal (dwibahasa) + konten halaman About |
| `/api/announcement` | `GET`/`POST` | Status banner pengumuman rebrand (`GET` cek tampil, `POST` catat dismiss) |
| `/api/maintenance` | `GET` | Status mode maintenance saat ini |

---

<a id="apicron-dipicu-eksternal"></a>
### `/api/cron/*` (dipicu eksternal)

Dilindungi header `Authorization: Bearer <CRON_SECRET>` — memanggil tanpa secret yang benar akan ditolak (`401`).

`vercel.json` mendeklarasikan jadwalnya untuk dokumentasi/referensi, tapi **Vercel Cron tidak benar-benar menjalankannya** selama project di plan **Hobby** (gratis) — Hobby hanya mengizinkan cron dieksekusi sekali per hari di jam yang tidak presisi/tidak terjamin. Sebagai gantinya, jadwal aktual dijalankan oleh **[cron-job.org](https://cron-job.org)** (layanan cron eksternal gratis) yang melakukan `GET` HTTP request langsung ke endpoint ini dengan header `Authorization: Bearer <CRON_SECRET>` sesuai jadwal masing-masing. Jika project di-upgrade ke plan Vercel **Pro**, `vercel.json` sudah siap dipakai dan cron-job.org bisa dinonaktifkan.

| Endpoint | Jadwal | Keterangan |
|---|---|---|
| `/api/cron/send-scheduled-blasts` | `0 0 * * *` (setiap hari 00:00 UTC) | Kirim `notification_blasts` berstatus `scheduled` yang jadwalnya sudah lewat |
| `/api/cron/prune-old-usage` | `0 3 * * *` (setiap hari 03:00 UTC) | Hapus baris `daily_usage` yang lebih tua dari `USAGE_RETENTION_DAYS` (90 hari) |

---

<a id="api-admin"></a>
### `/api/admin` & sub-route admin

Semua endpoint admin memerlukan cookie/header `Authorization: Bearer <nl_admin_token>` (didapat dari `POST /api/admin?action=login`, body `{ password }`).

| Endpoint | Method | Action / Keterangan |
|---|---|---|
| `/api/admin` | `POST` | `login`, `logout`, `update_password`, `update_config`, `update_maintenance`, `create_user`, `update_user`, `reset_user_password`, `delete_user`, `update_report` |
| `/api/admin` | `GET` | `user_meals`, `users` (pagination), `stats`, `config`, `reports` |
| `/api/admin` | `DELETE` | `delete_meal`, `delete_report` |
| `/api/admin/users/[userId]/meals` | `GET` | Riwayat meal satu user (untuk modal riwayat di halaman Users) |
| `/api/admin/upload-image` | `POST` | Upload hero image landing page (multipart, maks. 5MB) → Supabase Storage |
| `/api/admin/delete-image` | `POST` | Hapus hero image dari Supabase Storage |
| `/api/admin/migrate` | `POST` | Migrasi data lama dari Supabase KV Store → PostgreSQL |
| `/api/admin/landing` | `GET`/`POST` | CRUD konten landing page CMS |
| `/api/admin/footer` | `GET`/`POST`/`DELETE` | CRUD grup/link footer, `toggle_active` |
| `/api/admin/legal` | `GET`/`POST` | `upsert_document`, `delete_document`, `create_type`, `delete_type`, `upsert_about` |
| `/api/admin/limit` | `GET`/`POST` | `stats`, `requests`, `request`, `search_users`, `user_ledger`, `config` (GET); `approve`, `reject`, `update_config` (POST) |
| `/api/admin/blast` | `GET`/`POST` | `list`, `detail`, `recipients`, `estimate`, `lookup_username`, `resolve_username` (GET); `create`, `cancel`, `check_receipts` (POST) |
| `/api/admin/telegram/config` | `GET`/`POST` | Baca/ubah konfigurasi bot Telegram |
| `/api/admin/telegram/stats` | `GET` | Statistik pemakaian bot (jumlah user terhubung, analisa via bot, dll) |

---

<a id="cara-deploy-ke-vercel"></a>
## 🚀 Cara Deploy ke Vercel

### 1. Fork & Clone

```bash
git clone https://github.com/atmaboy/gizku-web.git
cd gizku-web
npm install
```

### 2. Siapkan Database di Supabase

1. Buat project baru di [supabase.com](https://supabase.com)
2. Masuk ke **SQL Editor**, jalankan seluruh file di folder `sql/` secara berurutan
3. Salin **Connection String** dari Settings → Database → Connection string (mode `Transaction` / port `6543`)

### 3. (Opsional) Siapkan Bot Telegram

1. Buat bot baru via [@BotFather](https://t.me/BotFather), catat token
2. Set env `TELEGRAM_BOT_TOKEN`, `TELEGRAM_WEBHOOK_SECRET`, `TELEGRAM_BOT_USERNAME`
3. Daftarkan webhook bot ke `POST https://<domain-kamu>/api/telegram/webhook`

### 4. Deploy ke Vercel

1. Push repo ke GitHub
2. Buka [vercel.com/new](https://vercel.com/new) → Import repository
3. **Framework Preset**: Next.js (auto-detected)
4. Tambahkan semua environment variables (lihat tabel di atas)
5. Klik **Deploy**

> ⚠️ **Deployment Protection:** Pastikan **Settings → Deployment Protection** di-set ke `Disabled` agar user eksternal dan aplikasi mobile bisa mengakses API.

### 5. Siapkan Cron Job (cron-job.org)

Project ini masih berjalan di plan Vercel **Hobby** (gratis), yang tidak menjalankan `vercel.json` cron sesuai jadwal presisi (dibatasi maks. sekali/hari, waktu eksekusi tidak dijamin). Jadwal aktual dijalankan lewat [cron-job.org](https://cron-job.org):

1. Daftar/login di [cron-job.org](https://cron-job.org)
2. Buat dua cronjob baru, masing-masing memanggil `GET` ke:
   - `https://<domain-kamu>/api/cron/send-scheduled-blasts` — jadwal harian `00:00 UTC`
   - `https://<domain-kamu>/api/cron/prune-old-usage` — jadwal harian `03:00 UTC`
3. Di tiap job, tambahkan custom header `Authorization: Bearer <CRON_SECRET>` (nilai yang sama dengan env var `CRON_SECRET` di Vercel)
4. Aktifkan notifikasi kegagalan (email) di cron-job.org agar tahu jika salah satu job gagal jalan

> Jika project di-upgrade ke plan **Pro**, cron bawaan Vercel (`vercel.json`) bisa dipakai langsung tanpa perlu cron-job.org — cukup pastikan `CRON_SECRET` tetap diset di Project Settings.

---

## 🖥️ Development Lokal

```bash
npm install
npm run dev
# → http://localhost:3000

npx drizzle-kit push   # sync schema
npm run lint
npm run typecheck
```

---

## 📋 Changelog

### v1.6.0 — 2026-08-06

#### 🔐 Consent Legal saat Register
- Checkbox persetujuan Syarat & Ketentuan + Kebijakan Privasi kini **wajib dicentang** sebelum submit register (sebelumnya hanya tautan informatif)
- Tautan Syarat & Ketentuan / Kebijakan Privasi ditambahkan di halaman login & register, mengarah ke `/legal/[slug]`

#### 💳 Request Kenaikan Limit Analisa
- Fitur baru: user mengajukan penambahan kuota harian via transfer bank manual — pilih tier, dapat kode unik nominal transfer, upload bukti, admin approve/reject
- Ledger terpusat (`lib/limitLedger.ts`) menghitung limit efektif user dari kombinasi limit dasar + tier aktif, dipakai konsisten di `/api/analyze`, `/api/history`, dan halaman Riwayat Limit
- Backoffice: konfigurasi tier paket & rekening bank tujuan, review pengajuan dengan alasan reject terstruktur

#### ✈️ Integrasi Telegram Bot
- Bot Telegram (grammY) untuk analisa foto makanan langsung dari chat — `/start`, `/help`, `/today`, `/link <token>`
- Linking akun via kode OTP 6 digit dari Settings, dengan whitelist opsional untuk staging
- Backoffice: konfigurasi & statistik bot Telegram

#### 📣 Notification Blast (Push & Telegram)
- Admin bisa mengirim broadcast ke seluruh user atau user tertentu lewat push notification (Expo → FCM/APNs) atau Telegram
- Bisa dijadwalkan (dieksekusi oleh cron job `send-scheduled-blasts`, dipicu cron-job.org karena plan Vercel Hobby), dengan tracking terkirim/diklik/dibaca/gagal per penerima dan pengecekan delivery receipt

#### 📜 Legal Document Configuration & Footer CMS
- Backoffice baru untuk mengelola dokumen legal (Syarat & Ketentuan, Kebijakan Privasi, tipe custom) secara dwibahasa dengan rich text editor, output disanitasi sebelum disimpan
- Backoffice baru untuk mengelola konten footer (grup & link)
- Halaman publik `/legal/[slug]` untuk menampilkan dokumen legal

#### 🌐 Dwibahasa (Indonesia/English)
- Seluruh halaman user-facing, hasil analisa AI, dan ledger limit kini mendukung Bahasa Indonesia & English, dipilih dari Settings

#### 🧪 Lainnya
- `StagingBanner` — penanda visual environment staging beserta project ref Supabase yang aktif
- Cron `prune-old-usage` — pembersihan otomatis data telemetri `daily_usage` yang sudah lewat masa retensi
- Ubah email dari halaman Settings (`/api/user?action=update_email`)
- Response API disederhanakan menjadi data mentah di top-level untuk sukses, `{ error }` untuk gagal (menggantikan pembungkus `{ ok, data }` lama)
- Penjadwalan cron (`send-scheduled-blasts`, `prune-old-usage`) dipindah dari Vercel Cron ke **cron-job.org** — plan Vercel saat ini masih **Hobby**, yang tidak menjalankan `vercel.json` cron sesuai jadwal presisi

---

### v1.5.1 — 2026-05-22

#### 🐛 Bug Fix
- **CTA label selalu dari CMS** — label tombol CTA di hero landing page tidak lagi di-override oleh status login user; kini selalu mengikuti konfigurasi yang diset admin di backoffice

---

### v1.5.0 — 2026-05-22

#### 🔑 Reset Password (User & Admin)
- **Admin reset password** — admin dapat reset password user melalui tab "Reset Password" di modal Edit User (backoffice)
- **Force change password** — setelah admin reset, user di-flag `must_change_password = true` dan diwajibkan ganti password saat login berikutnya sebelum bisa mengakses aplikasi
- **Halaman `/main/force-change-password`** — halaman dedicated untuk user mengganti password yang di-reset admin
- **Change-password overlay** di AppLayout sebagai guard tambahan
- **Audit trail** — kolom baru di tabel `users`: `must_change_password`, `password_changed_at`, `password_changed_by`, `admin_reset_by`

#### 🖼️ Hero Image Upload (Backoffice)
- Upload hero image via **drag-and-drop** di landing editor, disimpan ke **Supabase Storage**
- Endpoint baru: `POST /api/admin/upload-image`, helper baru `lib/supabase-storage.ts`

#### 📝 Landing Page CMS
- Seluruh konten landing page dapat dikonfigurasi via backoffice: **hero, how_it_works, features, stats, CTA**
- Tabel baru `landing_content`, API publik baru `GET /api/landing-content`

#### 🎨 Branding & 📱 Mobile Responsive (Admin Backoffice)
- Komponen `GizkuLogo` terpusat sebagai single source of truth
- Sidebar, halaman Users, Dashboard, MealHistoryModal, Landing editor, Reports & Config, Navbar dirapikan untuk mobile

---

### v1.4.0 — 2026-05-03

#### 🎨 Rebrand: NutriLog → Gizku
- Nama aplikasi resmi berganti dari NutriLog menjadi Gizku — seluruh UI, metadata, dan dokumentasi diperbarui
- Custom domain — tidak lagi menggunakan subdomain `vercel.app`

#### 🔔 Brand Announcement Widget
- Komponen `components/BrandAnnouncement.tsx` — notifikasi rebrand yang dismissible, disimpan ke `localStorage`

---

### v1.3.0 — 2026-04-26
- 🛡️ Validasi gambar non-makanan — AI menolak foto bukan makanan/minuman dengan `422`, kuota tidak terpotong
- ⚡ Error handling AI — `overloaded_error`, rate limit, invalid key, timeout menampilkan pesan user-friendly
- 🔐 Validasi token saat app load, auto-logout global saat `401`

### v1.2.0 — 2026-04-18
- ✅ Vercel Analytics
- 🔧 Maintenance auto-logout & banner di login

### v1.1.0 — 2026-04-17
- 🔄 Migrasi data dari Supabase KV Store ke PostgreSQL

### v1.0.0 — 2026-04-10
- 🎉 Initial release sebagai NutriLog — analisa foto, riwayat, autentikasi JWT, admin dashboard, dark/light mode, PWA-ready

---

## 🛠️ Tech Stack

| Layer | Teknologi |
|---|---|
| Framework | Next.js 15 (App Router) |
| UI | React 19, Tailwind CSS, DM Sans, Fraunces |
| Database | PostgreSQL via Supabase |
| ORM | Drizzle ORM |
| Auth | JWT (jose) — custom, tanpa NextAuth |
| AI | Anthropic Claude (Vision) |
| Storage | Supabase Storage (upload gambar) |
| Bot Telegram | grammY |
| Push Notification | Expo Push Service (relay ke FCM/APNs) |
| i18n | Context provider custom (ID/EN) |
| Analytics | Vercel Analytics, Vercel Speed Insights |
| Database hosting | Supabase (PostgreSQL + Storage) |
| Scheduler | cron-job.org (eksternal) memicu `/api/cron/*` — plan Vercel saat ini **Hobby**, jadi cron bawaan Vercel (`vercel.json`) tidak dipakai |
| Deploy | Vercel + Custom Domain |

---

## 📄 Lisensi

Private — © 2026 [dev.wiryawan@gmail.com](mailto:dev.wiryawan@gmail.com)
