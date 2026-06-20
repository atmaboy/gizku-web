# 🥗 Gizku

> Aplikasi pelacak nutrisi makanan berbasis AI — analisa foto makananmu dan catat asupan harian dengan mudah.

[![Next.js](https://img.shields.io/badge/Next.js-15-black?logo=next.js)](https://nextjs.org)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3ECF8E?logo=supabase)](https://supabase.com)
[![Deployed on Vercel](https://img.shields.io/badge/Deployed%20on-Vercel-black?logo=vercel)](https://vercel.com)
[![License](https://img.shields.io/badge/license-Private-red)](#)

> ⚠️ **Catatan Rebrand:** Aplikasi ini sebelumnya bernama **NutriLog**. Per Mei 2026, nama resmi telah berganti menjadi **Gizku**. Seluruh referensi `NutriLog` dalam kode dan dokumentasi ini merujuk pada versi lama.

---

## ✨ Fitur Utama

- 📷 **Analisa foto makanan** — upload foto atau ambil dari kamera, AI (Claude) akan mendeteksi nama makanan beserta kandungan kalori, protein, karbohidrat, dan lemak
- 📊 **Riwayat & statistik** — lihat rekap harian/mingguan beserta ringkasan nutrisi per hari
- 🔐 **Autentikasi** — sistem login/register dengan JWT, tanpa dependency pihak ketiga
- 🛠️ **Admin dashboard** — kelola user, limit harian, maintenance mode, laporan masukan
- 🔧 **Maintenance mode** — admin bisa mengaktifkan mode pemeliharaan; user aktif otomatis di-logout dan melihat pesan pemeliharaan di halaman login
- 🖼️ **Landing Page CMS** — seluruh konten landing page dapat dikonfigurasi via backoffice tanpa deploy ulang
- 🔑 **Reset Password** — admin dapat reset password user; user diwajibkan ganti password saat login berikutnya
- 📈 **Vercel Analytics** — tracking page views dan web vitals secara otomatis

---

## 🗂️ Struktur Direktori

```
nutrilog-next/
│
├── app/                          # Next.js App Router
│   ├── layout.tsx                # Root layout — inject font, Toaster, Vercel Analytics
│   ├── page.tsx                  # Landing page publik (hero, features, how it works, CTA)
│   ├── globals.css               # CSS variables (dark/light theme tokens)
│   │
│   ├── login/
│   │   └── page.tsx              # Halaman login & register; tampilkan banner maintenance + BrandAnnouncement
│   │
│   ├── main/
│   │   ├── layout.tsx            # Layout aplikasi utama (header, nav tab, auto-logout maintenance)
│   │   ├── catat/
│   │   │   └── page.tsx          # Halaman catat makan — upload foto & hasil analisa AI
│   │   ├── riwayat/
│   │   │   └── page.tsx          # Halaman riwayat — daftar meal & ringkasan nutrisi harian
│   │   └── force-change-password/
│   │       └── page.tsx          # Halaman wajib ganti password (setelah admin reset)
│   │
│   ├── admin/
│   │   ├── login/
│   │   │   └── page.tsx          # Halaman login admin
│   │   ├── page.tsx              # Dashboard admin — statistik & recent users
│   │   ├── users/
│   │   │   └── page.tsx          # Manajemen user — CRUD, reset password, audit trail
│   │   ├── reports/
│   │   │   └── page.tsx          # Laporan masukan user
│   │   ├── config/
│   │   │   └── page.tsx          # Konfigurasi global (daily limit, maintenance)
│   │   └── landing/
│   │       └── page.tsx          # Editor landing page CMS
│   │
│   ├── maintenance/
│   │   └── page.tsx              # Halaman maintenance (fallback statis)
│   │
│   └── api/                      # API Routes (Next.js Route Handlers)
│       ├── auth/
│       │   └── route.ts          # POST login, register, verify token, change_password, reset_password
│       ├── analyze/
│       │   └── route.ts          # POST analisa gambar makanan via Anthropic Claude
│       ├── history/
│       │   └── route.ts          # GET/POST/DELETE riwayat meal; GET today summary
│       ├── report/
│       │   └── route.ts          # POST kirim laporan/masukan; GET laporan milik user
│       ├── user/
│       │   └── route.ts          # GET/PATCH data profil user
│       ├── maintenance/
│       │   └── route.ts          # GET status maintenance mode
│       ├── landing-content/
│       │   └── route.ts          # GET konten landing page dari Supabase (publik)
│       └── admin/
│           ├── route.ts          # CRUD admin — user, config, maintenance, laporan, reset_user_password
│           ├── upload-image/
│           │   └── route.ts      # POST upload hero image ke Supabase Storage
│           └── migrate/
│               └── route.ts      # POST migrasi data dari Supabase KV → PostgreSQL
│
├── components/                   # Shared React components
│   ├── BrandAnnouncement.tsx     # Widget notifikasi rebrand NutriLog → Gizku (dismissible)
│   └── GizkuLogo.tsx             # Komponen logo terpusat (bowl+spoon SVG, green circle)
│
├── drizzle/
│   └── schema.ts                 # Drizzle ORM schema — definisi tabel PostgreSQL
│
├── lib/
│   ├── auth.ts                   # JWT sign/verify, hashPassword, extractToken
│   ├── admin.ts                  # Helper admin — requireAdmin guard
│   ├── db.ts                     # Drizzle client (koneksi ke Supabase PostgreSQL)
│   ├── supabase-storage.ts       # Helper upload & delete file via Supabase Storage service_role
│   └── utils.ts                  # Helper: setCors, ok, err, todayISO, dll
│
├── sql/                          # Raw SQL migration scripts (referensi)
├── public/                       # Static assets (favicon, manifest.json, icons)
│
├── middleware.ts                 # Next.js middleware — cek maintenance mode di edge
├── drizzle.config.ts             # Konfigurasi Drizzle Kit
├── next.config.ts                # Konfigurasi Next.js
├── tailwind.config.ts            # Konfigurasi Tailwind CSS
├── .env.example                  # Template environment variables
└── package.json                  # Dependencies & scripts
```

---

## ⚙️ Environment Variables

Salin `.env.example` ke `.env.local` lalu isi nilai yang sesuai:

```bash
cp .env.example .env.local
```

| Variable | Keterangan |
|---|---|
| `DATABASE_URL` | Connection string PostgreSQL Supabase |
| `SUPABASE_URL` | URL project Supabase (`https://xxx.supabase.co`) |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key Supabase (untuk migrasi data & storage upload) |
| `NEXT_PUBLIC_SUPABASE_URL` | URL publik Supabase (untuk client-side storage) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Anon key Supabase (untuk client-side) |
| `JWT_SECRET` | Secret key untuk signing JWT (min. 32 karakter) |
| `ANTHROPIC_API_KEY` | API key Anthropic Claude (analisa gambar) |
| `ADMIN_PASSWORD_HASH` | Bcrypt hash password admin |

---

## 🔌 API Reference

### Konvensi Umum

Semua response menggunakan format JSON. Field `ok` menandakan keberhasilan request.

**Response sukses:**
```json
{ "ok": true, "data": { ... } }
```

**Response error:**
```json
{ "ok": false, "error": "Pesan error" }
```

**Authentication header** (wajib untuk semua endpoint kecuali `/api/auth?action=login|register` dan `/api/maintenance`):
```
Authorization: Bearer <jwt_token>
```

---

### HTTP Status Code

| Code | Arti | Kapan Muncul |
|------|------|--------------|
| `200` | OK | Request berhasil |
| `204` | No Content | CORS preflight (OPTIONS) |
| `400` | Bad Request | Body/parameter tidak valid atau tidak lengkap |
| `401` | Unauthorized | Token tidak ada, tidak valid, atau kadaluarsa |
| `403` | Forbidden | Akun tidak aktif (dinonaktifkan admin) |
| `404` | Not Found | Resource tidak ditemukan (meal ID salah, dll) |
| `409` | Conflict | Data sudah ada (username duplikat) |
| `422` | Unprocessable Entity | Gambar tidak mengandung makanan |
| `429` | Too Many Requests | Batas analisa harian user tercapai, atau rate limit Anthropic |
| `500` | Internal Server Error | Error tak terduga di server |
| `503` | Service Unavailable | AI sedang overload, API key tidak valid, maintenance aktif |

---

### `/api/auth`

#### `POST ?action=register`

Daftarkan akun user baru.

**Body:**
```json
{ "username": "string (min 3)", "password": "string (min 6)" }
```

**Response Codes:**

| Code | Kondisi |
|------|---------|
| `200` | Registrasi berhasil — mengembalikan `token` dan `user` |
| `400` | Username atau password tidak dikirim / terlalu pendek |
| `409` | Username sudah digunakan |
| `503` | Maintenance mode aktif |

**Response 200:**
```json
{
  "ok": true,
  "data": {
    "token": "eyJ...",
    "user": { "id": "uuid", "username": "atmaklasik" }
  }
}
```

---

#### `POST ?action=login`

Login dan dapatkan JWT token.

**Body:**
```json
{ "username": "string", "password": "string" }
```

**Response Codes:**

| Code | Kondisi |
|------|---------|
| `200` | Login berhasil — mengembalikan `token`, `user`, `dailyLimit` |
| `400` | Username atau password tidak dikirim |
| `401` | Username atau password salah |
| `403` | Akun tidak aktif (diblokir admin) |
| `503` | Maintenance mode aktif |

**Response 200 (normal):**
```json
{
  "ok": true,
  "data": {
    "token": "eyJ...",
    "user": { "id": "uuid", "username": "atmaklasik", "dailyLimit": 5 }
  }
}
```

**Response 200 (wajib ganti password):**
```json
{
  "ok": true,
  "data": {
    "token": "eyJ...",
    "user": { "id": "uuid", "username": "atmaklasik", "mustChangePassword": true }
  }
}
```
> Jika `mustChangePassword: true`, client harus redirect ke `/main/force-change-password`.

---

#### `POST ?action=verify`

Validasi JWT token yang tersimpan di client.

**Header:** `Authorization: Bearer <token>`

**Response Codes:**

| Code | Kondisi |
|------|---------|
| `200` | Token valid — mengembalikan data user terkini |
| `401` | Token tidak ada / tidak valid / kadaluarsa / akun tidak aktif |

---

#### `POST ?action=change_password`

Ganti password user yang sedang login (digunakan di halaman force-change-password dan overlay ganti password).

**Header:** `Authorization: Bearer <token>`

**Body:**
```json
{ "newPassword": "string (min 6)", "currentPassword": "string (opsional, untuk non-forced change)" }
```

**Response Codes:**

| Code | Kondisi |
|------|---------|
| `200` | Password berhasil diganti, flag `must_change_password` di-reset |
| `400` | `newPassword` tidak dikirim atau terlalu pendek |
| `401` | Token tidak valid atau `currentPassword` salah |

---

### `/api/analyze`

#### `POST`

Analisa gambar makanan menggunakan Anthropic Claude Vision. Kuota harian user akan dikurangi **hanya jika analisa berhasil**.

**Header:** `Authorization: Bearer <token>`

**Body (JSON):**
```json
{
  "image": "base64_string",
  "mimeType": "image/jpeg",
  "correction": "opsional — koreksi dari user untuk re-analisa"
}
```

**Response Codes:**

| Code | Kondisi |
|------|---------|
| `200` | Analisa berhasil — mengembalikan `analysis`, `usage` |
| `400` | Gambar tidak dikirim atau `Content-Type` tidak didukung |
| `401` | Token tidak valid |
| `422` | Gambar tidak mengandung makanan atau minuman |
| `429` | Batas analisa harian user tercapai, atau rate limit Anthropic |
| `503` | Server AI sedang overload / API key tidak valid / maintenance aktif / koneksi timeout |
| `500` | Error tak terduga saat analisa |

**Response 200:**
```json
{
  "ok": true,
  "data": {
    "analysis": {
      "dishes": [
        {
          "name": "Nasi Goreng",
          "portion": "1 piring",
          "calories": 450,
          "protein": 12.5,
          "carbs": 65.0,
          "fat": 15.0
        }
      ],
      "total": { "calories": 450, "protein": 12.5, "carbs": 65.0, "fat": 15.0 },
      "notes": "Kandungan karbohidrat tinggi",
      "healthScore": 6,
      "assessment": "Makanan cukup bergizi namun tinggi kalori."
    },
    "usage": { "used": 2, "limit": 5, "remaining": 3 }
  }
}
```

---

### `/api/history`

#### `GET ?action=list`

Ambil daftar riwayat meal dengan pagination.

**Query Params:** `page` (default: 1), `per_page` (default: 10)

**Response Codes:**

| Code | Kondisi |
|------|---------|
| `200` | Mengembalikan `meals[]`, `total`, `page`, `totalPages` |
| `401` | Token tidak valid |

---

#### `GET ?action=today`

Ambil ringkasan nutrisi hari ini beserta status penggunaan kuota.

**Response 200:**
```json
{
  "ok": true,
  "data": {
    "meals": [...],
    "summary": { "totalCalories": 850, "totalProtein": 35.0, "totalCarbs": 110.0, "totalFat": 28.0 },
    "usage": { "used": 3, "limit": 5, "remaining": 2 }
  }
}
```

---

#### `POST`

Simpan hasil analisa sebagai entri riwayat.

**Body:**
```json
{ "analysis": { ... }, "imageDataUrl": "data:image/jpeg;base64,..." }
```

---

#### `DELETE ?id=<meal_id>`

Hapus satu entri riwayat milik user yang sedang login.

---

### `/api/landing-content`

#### `GET`

Ambil seluruh konten landing page dari tabel `landing_content`. Endpoint ini **tidak memerlukan autentikasi**.

**Response 200:**
```json
{
  "ok": true,
  "data": [
    {
      "section": "hero",
      "slug": "hero-main",
      "title": "Makan Cerdas. Hidup Lebih Baik.",
      "subtitle": "...",
      "body": "...",
      "meta": { "hero_image_url": "...", "benefit_list": [...] },
      "is_active": true,
      "sort_order": 0
    }
  ]
}
```

---

### `/api/admin`

Semua endpoint admin memerlukan header:
```
Authorization: Bearer <nl_admin_token>
```

#### `POST ?action=login`

Login admin.

**Body:** `{ "password": "string" }`

| Code | Kondisi |
|------|---------|
| `200` | Login berhasil — set cookie `nl_admin_token` (HttpOnly, 4 jam) |
| `400` | Password tidak dikirim |
| `401` | Password salah |

---

#### `POST ?action=reset_user_password`

Reset password user oleh admin. User akan diwajibkan ganti password saat login berikutnya.

**Body:** `{ "id": "user_uuid", "newPassword": "string (min 6)" }`

| Code | Kondisi |
|------|---------|
| `200` | Password berhasil di-reset; `must_change_password` di-set `true`, audit trail dicatat |
| `400` | `id` atau `newPassword` tidak dikirim / terlalu pendek |
| `401` | Token admin tidak valid |

---

#### `POST ?action=update_user`

Ubah status aktif atau limit harian seorang user.

**Body:** `{ "id": "user_uuid", "isActive": true, "dailyLimit": 10 }`

---

#### `POST ?action=create_user`

Buat akun user baru dari admin.

**Body:** `{ "username": "string", "password": "string", "dailyLimit": 5 }`

---

#### `POST ?action=update_config`

Ubah konfigurasi global (daily limit default, API key Anthropic).

**Body:** `{ "dailyLimit": 5, "anthropicApiKey": "sk-ant-..." }`

---

#### `POST ?action=update_maintenance`

Aktifkan / nonaktifkan maintenance mode.

**Body:** `{ "enabled": true, "title": "...", "description": "..." }`

---

#### `GET ?action=dashboard`

Ambil statistik ringkasan dashboard admin.

---

#### `GET ?action=users`

Daftar semua user dengan pagination. Termasuk kolom audit trail reset password.

**Query Params:** `page`, `per_page` (default: 20)

---

#### `GET ?action=reports`

Daftar laporan user.

**Query Params:** `status` (`open` / `resolved` / `all`, default: `all`)

---

### `/api/admin/upload-image`

#### `POST`

Upload gambar hero ke Supabase Storage. Hanya bisa diakses oleh admin.

**Header:** `Authorization: Bearer <nl_admin_token>`

**Body:** `multipart/form-data` dengan field `file` (image/jpeg, image/png, image/webp, maks. 5MB)

**Response 200:**
```json
{ "ok": true, "data": { "url": "https://xxx.supabase.co/storage/v1/object/public/..." } }
```

---

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

### 3. Deploy ke Vercel

1. Push repo ke GitHub
2. Buka [vercel.com/new](https://vercel.com/new) → Import repository
3. **Framework Preset**: Next.js (auto-detected)
4. Tambahkan semua environment variables
5. Klik **Deploy**

> ⚠️ **Deployment Protection:** Pastikan **Settings → Deployment Protection** di-set ke `Disabled` agar user eksternal bisa mengakses aplikasi.

---

## 🖥️ Development Lokal

```bash
npm install
npm run dev
# → http://localhost:3000

npx drizzle-kit push   # sync schema
npm run lint
```

---

## 📋 Changelog

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
- **Bug fix** — flag `nl_must_change_password` di localStorage kini tersimpan dengan benar sebelum redirect ke force-change-password

#### 🖼️ Hero Image Upload (Backoffice)
- Upload hero image via **drag-and-drop** di landing editor
- Disimpan ke **Supabase Storage**, mengembalikan public URL
- API endpoint baru: `POST /api/admin/upload-image`
- Helper baru: `lib/supabase-storage.ts` untuk upload & delete via service_role
- Preview + delete gambar langsung dari editor

#### 📝 Landing Page CMS
- Seluruh konten landing page dapat dikonfigurasi via backoffice: **hero, how_it_works, features, stats, CTA**
- Field `benefit_list` di hero & CTA bottom dapat dikonfigurasi (textarea, 1 item per baris)
- Array `benefit_list` kosong dihormati — tidak fallback ke teks default
- Tabel baru `landing_content` di Supabase sebagai sumber data
- API publik baru: `GET /api/landing-content`

#### 🎨 Branding
- Komponen `GizkuLogo` terpusat di `components/GizkuLogo.tsx` sebagai single source of truth
- Logo konsisten di landing page, halaman login user, dan halaman login admin

#### 📱 Mobile Responsive (Admin Backoffice)
- **Sidebar** → drawer + bottom navigation di mobile (P1)
- **Halaman Users** → card list view + touch targets yang nyaman (P2)
- **Dashboard** → header, status badges, tabel recent users (P3)
- **MealHistoryModal** → touch targets, pagination, header (P4)
- **Landing editor** → card list, header, modal, touch targets
- **Reports & Config** → input+button layout, full-width buttons di mobile
- **Navbar** → user avatar compact, tidak overflow di mobile

#### 🔐 Navbar & Auth
- Navbar CTA: satu tombol hijau untuk guest, avatar username untuk user yang sudah login
- Baca auth state dari `localStorage` (`nl_token`, `nl_user`) — menggantikan fetch ke `/api/auth/me` yang tidak ada

#### 🐛 Bug Fixes
- Fix `requireAdmin` guard di `lib/admin.ts` — memperbaiki build error pada `delete-image` & `upload-image`
- Fix `<a href="/">` → `<Link>` — memperbaiki `next/no-html-link-for-pages` build error
- Fix hero `benefit_list` kosong tidak lagi fallback ke default
- Fix fetch endpoint `/api/landing-content` (sebelumnya salah ke `/api/landing`)

---

### v1.4.0 — 2026-05-03

#### 🎨 Rebrand: NutriLog → Gizku
- **Nama aplikasi resmi berganti** dari NutriLog menjadi **Gizku** — seluruh UI, metadata, dan dokumentasi diperbarui
- **Custom domain** — tidak lagi menggunakan subdomain `vercel.app`; aplikasi kini berjalan di domain sendiri
- **Fix Vercel 403 Forbidden** — Deployment Protection dinonaktifkan agar user eksternal dapat mengakses aplikasi

#### 🔔 Brand Announcement Widget
- Komponen baru `components/BrandAnnouncement.tsx` — notifikasi rebrand yang muncul di halaman Login dan Catat Makanan
- Background oranye on-brand dengan animasi slide-down
- **Dismissible** — disimpan ke `localStorage` (`gizku_brand_notice_dismissed`) setelah ditutup

#### 🗓️ UI Riwayat — Kartu Ringkasan Harian
- Summary card menggunakan background amber dengan border oranye dan label pill "Total Hari Ini"
- Meal card tetap putih — hierarki visual parent/child lebih jelas

---

### v1.3.0 — 2026-04-26
- 🛡️ **Validasi gambar non-makanan** — AI menolak foto bukan makanan/minuman dengan pesan `422`; kuota tidak terpotong
- ⚡ **Error handling AI** — `overloaded_error`, rate limit, invalid key, timeout kini menampilkan pesan user-friendly
- 🔐 **Validasi token saat app load** — token divalidasi ke server saat mount; jika `401` langsung force-logout
- 🔄 **Auto-logout global** — semua API call mendeteksi `401` dan otomatis redirect ke login
- 📖 **Dokumentasi API lengkap** — README diperbarui dengan seluruh endpoint, error code, dan contoh response

### v1.2.0 — 2026-04-18
- ✅ **Vercel Analytics** — tambah `@vercel/analytics` ke root layout
- 🔧 **Maintenance auto-logout** — user aktif otomatis di-logout saat maintenance diaktifkan
- 🛡️ **Maintenance banner di login** — banner kuning informatif saat aplikasi dalam pemeliharaan

### v1.1.0 — 2026-04-17
- 🔄 **Migrasi data** — route `POST /api/admin/migrate` untuk migrasi dari Supabase KV Store ke PostgreSQL
- 🗺️ **Mapping legacy ID** — konversi `u_xxx` legacy user ID ke UUID PostgreSQL secara deterministik
- 🚫 **Strip imageData** — base64 image tidak disimpan ke `rawAnalysis` saat migrasi

### v1.0.0 — 2026-04-10
- 🎉 **Initial release** sebagai NutriLog
- 📷 Analisa foto makanan via Anthropic Claude Vision
- 📊 Riwayat & statistik harian
- 🔐 Autentikasi JWT (login/register)
- 🛠️ Admin dashboard — manajemen user, daily limit, maintenance mode
- 🌙 Dark/light mode toggle
- 📱 PWA-ready (manifest + mobile viewport)

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
| Storage | Supabase Storage (hero image upload) |
| Analytics | Vercel Analytics |
| Deploy | Vercel + Custom Domain |

---

## 📄 Lisensi

Private — © 2026 [dev.wiryawan@gmail.com](mailto:dev.wiryawan@gmail.com)
