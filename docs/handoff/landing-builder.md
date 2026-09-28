# Handoff: Redesign Landing Page & Landing Builder Gizku

26 Sep 2026 · Atmaji Haryo Wiryawan

## Ringkasan & tujuan

Landing page publik Gizku (`/`) diganti dengan layout bergaya Nova (9 section), dan halaman admin `/admin/landing` diganti menjadi **Landing Builder** per section dengan alur Draf → Terbitkan sejak fase 1. Semua teks, urutan, visibilitas, tautan, dan SEO landing page bisa diatur dari backoffice tanpa deploy.

**Sumber desain (wajib dibuka developer):**

- Gambar desain: `docs/handoff/design/*.png` (13 artboard, lihat tabel di bawah). Sumber canvas asli: [Gizku Landing Page Redesign](https://claude.ai/code/artifact/9b27b8b5-5d55-41df-a07c-721e42e70b96).
- Design system: [Gizku Design System](https://claude.ai/code/artifact/6733d696-4c6e-4f24-9f48-4e3aa59257cf) — salinan token ada di `docs/handoff/design-tokens/gizku-tokens.json`; token yang sama sudah ada di `app/globals.css` + `tailwind.config.ts`.
- Referensi layout: [Nova Free Theme](https://github.com/xriley/Nova-Free-Theme) (hanya struktur; tidak ada aset/kode Nova yang disalin).
- Repo: [atmaboy/gizku-web](https://github.com/atmaboy/gizku-web).

| File gambar | Isi |
| --- | --- |
| `01-landing-desktop-1440.png` | Landing page desktop |
| `02-landing-mobile-390.png` | Landing page mobile |
| `10-builder-header.png` | Builder — Header & Navigasi |
| `11-builder-hero.png` | Builder — Hero (+ pratinjau langsung) |
| `12-builder-statistik.png` | Builder — Statistik (otomatis vs manual) |
| `13-builder-cara-kerja.png` | Builder — Cara Kerja |
| `14-builder-fitur.png` | Builder — Fitur (2 baris) |
| `15-builder-testimoni.png` | Builder — Testimoni + drawer edit item |
| `16-builder-faq.png` | Builder — FAQ |
| `17-builder-cta-download.png` | Builder — CTA & Download |
| `18-builder-footer.png` | Builder — Footer |
| `19-builder-pengaturan-global.png` | Pengaturan global (tujuan tombol, tautan download, SEO) |
| `20-builder-mobile-390.png` | Builder versi mobile |

**Definisi selesai:**

1. `/` merender 9 section sesuai desain, 100% dari DB (fallback statis hanya jika DB gagal).
2. Admin bisa mengedit, mengurutkan, menyembunyikan section, lalu menerbitkan sekaligus; pengunjung tidak melihat draf.
3. Section `blog_post`, field `body`, JSON meta mentah, dan halaman `/admin/footer` sudah tidak ada di UI.
4. Endpoint publik `/api/landing-content` dan `/api/footer-content` tetap jalan (dipakai klien lain) — lihat bagian Risiko.

## Konteks repo gizku-web

Stack: Next.js 15 App Router, React 19, Tailwind 3 (token lewat CSS variables), Drizzle ORM + Postgres (Supabase), Supabase Storage untuk upload, JWT admin di cookie `nl_admin_token`, deploy Vercel. Migrasi DB ditulis manual sebagai file SQL bernomor di `sql/` (terakhir `017_add_image_hash_to_meals.sql`), lalu skema disamakan di `drizzle/schema.ts`.

| File | Peran sekarang | Nasib |
| --- | --- | --- |
| `app/page.tsx` | Landing server component, 5 section + footer, `FALLBACK` statis, JSON-LD, metadata SEO hardcoded | Ditulis ulang |
| `lib/landingContent.ts` | `getLandingContentGrouped`, `getFooterContentBySlug` (unstable_cache, tag `landing-content` / `footer-content`) | Diganti `getPublishedLanding()` |
| `components/landing/AuthAwareCTA.tsx`, `NavAuthArea.tsx` | Client island: href tombol berdasar status login | Dipakai ulang |
| `components/GizkuLogo.tsx` | Logo SVG | Dipakai ulang |
| `app/admin/(panel)/landing/page.tsx` | Tabel CRUD + modal, section `blog_post`, textarea Meta JSON | Diganti Landing Builder |
| `app/admin/(panel)/footer/page.tsx` | CRUD footer terpisah | Dihapus, pindah ke builder |
| `app/api/admin/landing/route.ts`, `app/api/admin/footer/route.ts` | CRUD `landing_content` | Diganti `app/api/admin/landing-builder/*` |
| `app/api/landing-content/route.ts`, `app/api/footer-content/route.ts` | GET publik | Dipertahankan, dibaca dari tabel baru (lihat API) |
| `app/api/admin/upload-image/route.ts` + `lib/supabase-storage.ts` | Upload hero image (maks 5 MB) | Dipakai ulang untuk semua gambar builder |
| `components/admin/HeroImageUploader.tsx` | Uploader | Digeneralisasi jadi `ImageUploader` |
| `components/admin/shell/nav.ts` | Sidebar: Halaman Publik → Landing Page, Footer, Dokumen Legal | Hapus item Footer |
| `app/admin/(panel)/page.tsx` | Kartu “Konten Landing — Hero, fitur, CTA, blog” | Ganti teks jadi “Hero, fitur, FAQ, footer” |
| `lib/admin.ts` | `requireAdmin(req)` | Guard semua endpoint builder |
| `components/admin/ui/*` | UI kit admin (Button, Card, FormField, Switch, Modal, Tabs, dll.) | Dipakai untuk builder |

Tabel `landing_content` sekarang: `id, section, slug (unique), title, subtitle, body, meta jsonb, is_active, sort_order, created_at, updated_at`. Section yang dipakai: `hero, how_it_works, features, stats, cta, footer` (+ `blog_post` yang tidak pernah dirender).

## Scope

**Dibuat baru**

- Section landing: Testimoni (carousel), FAQ (accordion + JSON-LD `FAQPage`), badge download (App Store, Google Play, Telegram) di Hero dan CTA.
- Tombol kedua di Hero, kalimat pengantar di Statistik, 2 fitur baru (Telegram, Dua Bahasa) sebagai data awal.
- Landing Builder: 9 halaman section + Pengaturan global + versi mobile.
- Alur Draf → Terbitkan, indikator jumlah perubahan, Buang draf, Pratinjau draf.
- Statistik otomatis dari DB (jumlah user, jumlah makanan tercatat).
- SEO (title, description, gambar OG) bisa diatur dari admin.

**Diubah**

- `app/page.tsx` → komponen per section di `components/landing/sections/*`.
- Metadata `generateMetadata()` membaca SEO dari DB.
- Sidebar admin dan kartu dashboard (teks).

**Dihapus / digabung**

| Item | Alasan | Pengganti |
| --- | --- | --- |
| Section `blog_post` di admin | Tidak pernah dirender di landing | — |
| Field `body` | Tidak dipakai section mana pun | — |
| Textarea “Meta (JSON)” | Rawan salah ketik, tidak ramah non-dev | Field terstruktur per section |
| Input `slug` & `sort_order` manual | Detail teknis | Slug otomatis, urutan via drag |
| Tabel CRUD + filter per section | Pola “database” | Daftar section + form + pratinjau |
| Halaman & menu `/admin/footer` | Konfigurasi terpecah | Section Footer di builder |
| URL CTA guest/auth per section | Diisi berulang | Satu setelan di Pengaturan global |
| Checklist keunggulan di CTA bawah | Dobel dengan Hero | Badge download |
| Catatan kecil di bawah tombol CTA | Menambah noise | — |
| Tautan “Learn more” kartu fitur (dari template) | Tidak ada halaman tujuan | — |

**Di luar scope:** konten landing dwibahasa (ID/EN), A/B testing, versi histori lebih dari 1 draf, halaman blog.

## Spesifikasi landing page

Urutan tetap: Header di atas, Footer di bawah; 7 section di tengah bisa diurutkan dan disembunyikan. Section tanpa item aktif tidak dirender (termasuk anchor-nya di menu). Kontainer desktop 1200 px (padding samping 120 px pada 1440), mobile padding 20 px.

| Section (anchor) | Desktop | Mobile (≤ 767 px) | Field dari CMS |
| --- | --- | --- | --- |
| Header | Tinggi 80, sticky, bg `sand-25` 92% + blur, garis bawah `sand-200`. Logo + nama kiri, menu tengah, tombol pill `green-600` kanan | Tinggi 64, tombol “Buka Aplikasi” + hamburger (44 px) membuka panel menu | brand_name, logo_url, nav_items[], header_button_label, sticky |
| Hero (`#top`) | 2 kolom: teks kiri, visual 560×660 kanan (2 bidang hijau miring + mockup HP + 2 kartu mengambang) | 1 kolom center, 2 tombol full width, visual di bawah | eyebrow, title (baris ke-2 hijau), subtitle, primary_cta, secondary_cta?, benefits[≤4], visual (mockup / gambar), show_store_badges |
| Statistik | Band `green-700`, pengantar kiri 260 px + grid 3–4 angka (44 px/800) | Grid 3 kolom, angka 22 px | intro, band_variant (green / sand / dark), items[≤4]: source, metric, format, value, label |
| Cara Kerja (`#cara-kerja`) | Bg putih, heading center, grid 3 kartu `sand-50` radius 24, ikon 72 px di kotak hijau | Kartu horizontal bertumpuk | eyebrow, title, subtitle, show_numbers, items[≤4]: icon, title, description |
| Fitur (`#fitur`) | Bg `sand-50`; baris 1: visual kiri + kartu kanan; baris 2: kartu kiri + visual kanan; kartu putih shadow, ikon 52 px | Visual lalu kartu bertumpuk | eyebrow, title, subtitle, row1/row2: visual (riwayat / analisa / telegram / gambar), items[≤4]: icon, title, description |
| Testimoni (`#testimoni`) | Carousel kartu 380 px, kartu aktif `green-600`, bintang `accent-honey`, dots + tombol prev/next 48 px | 1 kartu 310 px + dots, swipe | eyebrow, title, subtitle, autoplay, show_rating, items: name, city, rating 1–5, quote ≤240, avatar_url?, consent |
| FAQ (`#faq`) | 2 kolom: judul + tombol kontak kiri 400 px, accordion kanan; item terbuka ber-border `green-300` | 1 kolom, kontak jadi link di bawah | eyebrow, title, subtitle, contact_label, contact_url, items: question, answer_html, open_default |
| CTA & Download | Kotak `green-600` radius 32 dalam padding halaman, lingkaran dekoratif, tombol putih + badge store | Kotak radius 24, tombol full width | title, subtitle, button_label, bg_variant (green / dark / sand), badge_label, badges[] |
| Footer | Bg `bark-900`, kolom brand 320 px + grid grup link, copyright center | Brand lalu grid 2 kolom | tagline, socials[], link_groups[≤4]: name, links[], legal_auto_sync, copyright (`{tahun}`) |

**Token (pakai kelas Tailwind yang sudah ada, jangan hex baru):**

| Peran | Token | Hex |
| --- | --- | --- |
| Latar halaman | `sand-25` / `bg-page` | #fdfbf7 |
| Latar section alternatif | `sand-50` / `bg-sunken` | #faf6ef |
| Brand, tombol utama | `green-600` / `bg-brand` | #3d7833 |
| Band statistik, teks link | `green-700` | #305f29 |
| Tint ikon, eyebrow | `green-50` / `green-200` | #f2f7f0 / #c3dbba |
| Teks utama / sekunder | `bark-900` / `clay-600` | #241e19 / #6b5c4a |
| Garis | `sand-200` / `sand-300` | #e7dcc7 / #d5c5a8 |
| Footer | `bark-900` | #241e19 |
| Rating, makro karbo | `accent-honey` | #d99b3f |
| Makro protein / lemak | `accent-tomato` / `accent-sage` | #c1603f / #6f9b7c |

Tipografi: Inter (sudah via `--font-inter`). H1 hero 60/1.08/800 desktop, 36 mobile; H2 section 40/800 desktop, 28 mobile; body 17–19 desktop, 15–16 mobile; eyebrow 13/700 uppercase tracking 0.08em. Radius: tombol pill, kartu 18–24, badge store 12.

**Aturan tampilan:**

- Badge store tampil hanya jika aktif di Pengaturan global DAN URL-nya terisi. Pakai badge resmi Apple/Google (SVG dari brand guideline mereka), bukan tiruan di desain.
- Mockup HP di-render sebagai komponen React (bukan gambar) seperti `PhonePreview` sekarang; angka di dalam mockup ilustratif dan boleh hardcoded.
- Aksesibilitas: semua tombol `<button>`/`<a>` asli, target sentuh ≥ 44 px, kontras teks ≥ 4.5:1 (jangan pakai `sand-400` untuk teks di atas putih), accordion pakai `aria-expanded`, carousel bisa dijalankan keyboard dan berhenti saat hover/fokus, `prefers-reduced-motion` mematikan autoplay.
- Tetap server component untuk konten; client island hanya untuk: auth-aware CTA/nav, menu mobile, carousel, accordion.

## Spesifikasi backoffice Landing Builder

Rute: `/admin/landing` (redirect ke `/admin/landing/hero`), `/admin/landing/[section]`, `/admin/landing/settings`. Semua halaman memakai `AdminPage` + tata letak 3 kolom yang sama:

| Kolom | Lebar (desktop) | Isi |
| --- | --- | --- |
| Susunan Halaman | 280 px | 9 section; Header & Footer terkunci (tanpa drag/toggle); 7 lainnya: handle drag, nama, ringkasan (“3 langkah”, “2 perubahan”), switch tampil. Kartu “Pengaturan global →” di bawah. |
| Form section | 462–500 px | Header kartu (nama + status), body scroll, footer “Draf tersimpan otomatis · HH.mm” |
| Pratinjau | sisa | Render komponen landing asli dengan data draf; toggle Desktop/Mobile; section aktif diberi outline putus-putus hijau + label “Sedang diedit” |

**Bar atas halaman:** chip status (`Draf · N perubahan belum diterbitkan` warna honey, atau `Tayang · tidak ada perubahan` warna hijau), tombol Buang draf (konfirmasi modal), Pratinjau (buka `/` dalam mode draf di tab baru), Terbitkan (disabled bila N = 0; modal ringkasan perubahan per section + konfirmasi).

**Autosave:** debounce 800 ms per field ke draf; gagal simpan → toast error + chip “Belum tersimpan”. Validasi dijalankan saat Terbitkan juga (lihat Acceptance).

| Halaman | Field & aturan |
| --- | --- |
| Header & Navigasi | Nama brand; ganti logo (SVG/PNG); menu ≤ 5 baris: drag, label, tujuan (section yang ada / URL internal / URL eksternal), switch aktif — menu ke section tersembunyi otomatis nonaktif & diberi keterangan; tombol kanan: label + tujuan “Otomatis”; switch sticky. |
| Hero | Eyebrow; judul ≤ 80 char (baris ke-2 hijau, textarea 2 baris); deskripsi ≤ 160; tombol utama (label + tujuan); tombol kedua opsional (kosong = sembunyi); poin keunggulan chip ≤ 4; visual: segmented Mockup bawaan / Gambar kustom (PNG/WebP 1:2, ≤ 2 MB); switch badge download. |
| Statistik | Pengantar ≤ 70; warna band (green / sand / dark); angka ≤ 4: sumber Otomatis (metrik: `users_active`, `users_login_30d`, `meals_total`; format: “bulatkan ke bawah + ‘+’”, angka penuh) atau Manual (value bebas + peringatan kuning); label. |
| Cara Kerja | Eyebrow, judul*, deskripsi; switch nomor langkah; langkah ≤ 4 (accordion): ikon dari set (kamera, sparkle, grafik, scan, riwayat, kirim, dll.), judul, deskripsi ≤ 120. |
| Fitur | Eyebrow, judul*, deskripsi; Baris 1 (visual kiri) dan Baris 2 (visual kanan): pilih visual (mockup riwayat / hasil analisa / chat Telegram / gambar kustom), fitur ≤ 4 per baris (ikon, judul, deskripsi); fitur bisa di-drag antar baris; baris kosong disembunyikan. |
| Testimoni | Eyebrow, judul, deskripsi; switch geser otomatis (6 s) & rating; daftar item (avatar/inisial, nama, kota, rating, status Tayang/Draf, edit). Drawer edit: foto opsional, nama*, kota/profesi, rating 1–5, kutipan* ≤ 240, checkbox izin pengguna (wajib untuk Tayang), status, Hapus. Banner kuning bila section disembunyikan. |
| FAQ | Eyebrow, judul*, deskripsi; tombol kontak (label + `mailto:`/URL); pertanyaan (drag, status Tayang/Draf); editor jawaban: bold, italic, link, list, ≤ 500 char, sanitasi allowlist sama seperti `RichTextEditor` dokumen legal; checkbox “terbuka saat dimuat”. |
| CTA & Download | Judul* ≤ 70, deskripsi, label tombol + tujuan, gaya latar (green / dark / sand), switch badge, teks di atas badge, checkbox per badge dengan status tautan dari Pengaturan global. |
| Footer | Tagline; sosial media (platform select + URL, Telegram ikut URL bot global); grup link ≤ 4 (nama, link: label + tujuan); grup Legal bisa “Sinkron otomatis dari Dokumen Legal” (ambil dokumen aktif); copyright dengan token `{tahun}`. |
| Pengaturan global | Banner info “menu ada di Header”; tujuan tombol otomatis (guest `/login`, auth `/main/riwayat`); tautan App Store / Google Play / Telegram + switch; SEO: title ≤ 60, description ≤ 160 (merah bila lewat), gambar OG 1200×630, pratinjau hasil Google. |

**Mobile admin (≤ 1023 px):** daftar section full width (switch 44×26, chevron) → tap membuka form section full-screen (sheet) dengan tombol Pratinjau; bar bawah sticky: Pratinjau + Terbitkan. Drag diganti tombol “Urutkan” (mode naik/turun).

**Sidebar & dashboard:** hapus item “Footer” dari `nav.ts`; kartu dashboard jadi “Konten Landing — Hero, fitur, FAQ, footer” dan statistiknya menghitung section tampil, bukan baris tabel.

## Model data & migrasi

Rekomendasi: simpan seluruh konfigurasi landing sebagai **satu dokumen JSON tervalidasi Zod** dengan dua baris (draf & tayang) plus tabel riwayat terbit. Ini menggantikan usulan tabel `landing_sections`/`landing_items` di sticky note canvas.

| Opsi | Pro | Kontra |
| --- | --- | --- |
| **A. Dokumen JSON draf/tayang (dipilih)** | Terbitkan = salin 1 baris (atomik); pratinjau & diff mudah; rollback dari riwayat; skema berubah cukup di Zod, tanpa migrasi SQL | Validasi wajib di aplikasi (Zod); query per item (mis. hitung testimoni) lewat JSON |
| B. Tabel ternormalisasi + kolom `draft_*` | Query SQL per item; constraint di DB | Publish menyentuh banyak baris (perlu transaksi besar); setiap field baru = migrasi; diff & rollback rumit |

**SQL — `sql/018_create_landing_builder.sql`**

```sql
CREATE TABLE IF NOT EXISTS landing_page (
  state        TEXT PRIMARY KEY CHECK (state IN ('draft','published')),
  content      JSONB NOT NULL,
  schema_version INTEGER NOT NULL DEFAULT 1,
  revision     INTEGER NOT NULL DEFAULT 1,      -- optimistic lock untuk autosave
  updated_by   TEXT,
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  published_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS landing_page_history (
  id           SERIAL PRIMARY KEY,
  content      JSONB NOT NULL,
  schema_version INTEGER NOT NULL,
  published_by TEXT,
  published_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  change_summary JSONB          -- mis. {"hero":2,"faq":1}
);
CREATE INDEX IF NOT EXISTS idx_landing_history_published_at ON landing_page_history(published_at DESC);
```

Tabel `landing_content` **tidak dihapus** di fase 1 (dibiarkan read-only sebagai cadangan); dihapus di migrasi terpisah setelah 2 minggu stabil.

**Bentuk dokumen (`lib/landing/schema.ts`, ringkas):**

```ts
const Link = z.object({ label: z.string().max(40), target: z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('section'), section: SectionKey }),
  z.object({ kind: z.literal('internal'), path: z.string().startsWith('/') }),
  z.object({ kind: z.literal('external'), url: z.string().url() }),
  z.object({ kind: z.literal('auto') }),            // guest → cta_url_guest, login → cta_url_auth
]) })

export const LandingContent = z.object({
  order: z.array(SectionKey),                          // 7 section tengah, header/footer tidak termasuk
  visibility: z.record(SectionKey, z.boolean()),
  settings: z.object({ ctaUrlGuest, ctaUrlAuth, stores: { appStore, googlePlay, telegram }, seo: { title, description, ogImageUrl } }),
  header:  z.object({ brandName, logoUrl: z.string().url().nullable(), nav: z.array(NavItem).max(5), button: Link, sticky: z.boolean() }),
  hero:    z.object({ eyebrow, title: z.string().min(1).max(80), subtitle: z.string().max(160), primary: Link, secondary: Link.nullable(), benefits: z.array(z.string().max(40)).max(4), visual: Visual, showStoreBadges: z.boolean() }),
  stats:   z.object({ intro, band: z.enum(['green','sand','dark']), items: z.array(StatItem).max(4) }),
  howItWorks: z.object({ eyebrow, title, subtitle, showNumbers, items: z.array(Step).max(4) }),
  features: z.object({ eyebrow, title, subtitle, rows: z.tuple([FeatureRow, FeatureRow]) }),
  testimonials: z.object({ eyebrow, title, subtitle, autoplay, showRating, items: z.array(Testimonial) }),
  faq:     z.object({ eyebrow, title, subtitle, contact: Link, items: z.array(FaqItem) }),
  cta:     z.object({ title, subtitle, button: Link, bg: z.enum(['green','dark','sand']), badgeLabel, badges: z.array(z.enum(['appStore','googlePlay','telegram'])) }),
  footer:  z.object({ tagline, socials: z.array(Social), groups: z.array(LinkGroup).max(4), legalAutoSync: z.boolean(), copyright: z.string() }),
})
// item: { id: string (nanoid), status?: 'live'|'draft', ... } — id stabil untuk drag & diff
// StatItem: { id, source: 'auto'|'manual', metric?: 'users_active'|'users_login_30d'|'meals_total', format?: 'floor_plus'|'full', value?: string, label, resolvedValue?: string }
// Testimonial: { id, name, city, rating: 1..5, quote ≤240, avatarUrl?, consentAt: ISO|null, status }  → 'live' wajib consentAt
```

**Migrasi data awal (`scripts/seed-landing-from-legacy.ts` atau aksi di endpoint admin migrate yang sudah ada):**

1. Baca `landing_content` aktif. Petakan: `hero` → `hero` (title, subtitle, `meta.cta_label`, `meta.benefit_list`, `meta.hero_image_url`, `meta.cta_url_guest/auth` → `settings`); `how_it_works` → `howItWorks.items` (icon dari `meta.icon`); `features` → `features.rows[0].items`; `stats` → `stats.items` (source `manual`); `cta` → `cta`; baris `footer-*` → `footer` (tagline, `links_group` → groups, `footer-social` → socials, copyright).
2. Isi default untuk section baru dari desain: Testimoni kosong + tersembunyi, FAQ 5 pertanyaan (hanya “Apakah Gizku gratis?” berstatus live; 4 lainnya draft sampai jawabannya ditulis), fitur Telegram & Dua Bahasa di `rows[1]`, SEO dari konstanta di `app/page.tsx`.
3. Tulis hasil ke baris `draft` dan `published` (identik), validasi Zod harus lolos; `blog_post` & `body` diabaikan.
4. Idempotent: jika `landing_page` sudah berisi, skip kecuali `--force`.

## API, alur Draf → Terbitkan, caching

Admin hanya menulis ke baris `draft`; pengunjung hanya membaca baris `published` yang di-cache; Terbitkan menyalin draf ke tayang dalam satu transaksi lalu membersihkan cache.

```mermaid
flowchart LR
  A[Admin edit field] -->|autosave 800 ms\nPATCH draft + revision| B[(landing_page: draft)]
  B --> C[Pratinjau\ndraftMode()]
  B -->|Terbitkan| D{Validasi Zod penuh\n+ aturan terbit}
  D -->|gagal| E[Modal daftar error\nper section]
  D -->|lolos| F[Hitung statistik otomatis]
  F --> G[Transaksi: history + published = draft]
  G --> H[revalidateTag landing\nrevalidatePath /]
  H --> I[(landing_page: published)] --> J[Pengunjung /]
  B -->|Buang draf| K[draft = published]
```

| Endpoint (semua `requireAdmin`) | Metode | Body → respons | Catatan |
| --- | --- | --- | --- |
| `/api/admin/landing-builder` | GET | → `{ draft, revision, publishedAt, changes: {hero: 2, …} }` | `changes` = diff draf vs tayang per section |
| `/api/admin/landing-builder/draft` | PATCH | `{ revision, path: 'hero' \| 'order' \| 'settings' \| …, value }` → `{ revision }` | Validasi Zod bagian itu saja; `409` bila revision beda (tampilkan “Diubah admin lain, muat ulang”) |
| `/api/admin/landing-builder/publish` | POST | `{ revision }` → `{ publishedAt, historyId }` | Validasi penuh + aturan terbit; `422` berisi daftar error per section |
| `/api/admin/landing-builder/discard` | POST | `{ revision }` | draft = published |
| `/api/admin/landing-builder/preview` | GET | → redirect `/` | Aktifkan `draftMode()` setelah cek admin; `?exit=1` mematikan |
| `/api/admin/landing-builder/history` | GET | → 10 terbitan terakhir | Untuk fase 2 UI; endpoint dibuat di fase 1 |
| `/api/admin/landing-builder/rollback` | POST | `{ historyId }` | Menyalin versi lama ke **draf** (bukan langsung tayang) |
| `/api/admin/upload-image` | POST | tambah field `folder` (`landing/hero`, `landing/og`, `landing/logo`, `landing/testimonials`, `landing/features`) | Validasi tipe & ukuran per folder |

**Aturan terbit (server):**

- Judul wajib untuk section yang tampil; batas karakter sesuai spesifikasi.
- Testimoni `live` wajib `consentAt`; section Testimoni tampil dengan 0 item `live` → otomatis disembunyikan + peringatan (bukan error).
- Menu yang menunjuk section tersembunyi → disembunyikan saat render (bukan error).
- URL eksternal harus `https://`; `mailto:` diizinkan untuk kontak FAQ.
- Rich text FAQ disanitasi server-side dengan allowlist yang sama dengan dokumen legal.

**Statistik otomatis** dihitung saat Terbitkan dan disimpan di `resolvedValue` (halaman publik tidak menjalankan query hitung): `users_active` = `count(users) where is_active`, `users_login_30d` = `where last_login_at > now() - 30 days`, `meals_total` = `count(meals)`. Format `floor_plus`: < 1.000 → bulatkan ke puluhan; < 100.000 → ke ribuan; selebihnya ke puluh-ribuan; format `id-ID` + “+” (12.431 → “12.000+”).

**Sisi publik:**

- `lib/landing/getPublishedLanding.ts` = `unstable_cache` tag `landing`, `revalidate: false`; fallback ke konstanta default bila DB gagal (pola `FALLBACK` sekarang).
- `app/page.tsx`: `const { isEnabled } = await draftMode()` → bila aktif **dan** cookie admin valid, baca draf tanpa cache + tampilkan banner “Mode pratinjau draf” + `robots: noindex`.
- `generateMetadata()` membaca `settings.seo`; JSON-LD Organization + WebApplication tetap, tambah `FAQPage` dari item FAQ `live`.
- `/api/landing-content` & `/api/footer-content`: pertahankan bentuk respons lama lewat adapter `toLegacySectionMap()` dari dokumen tayang, supaya klien lain tidak rusak.

## Fase implementasi & task untuk Claude Code

Kerjakan dalam 3 PR berurutan supaya bisa di-review dan di-rollback terpisah. Setiap PR harus lolos `npm run typecheck`, `npm run lint`, dan `npm run build`.

**PR 1 — Data layer + landing publik** (landing baru tayang, masih dibaca dari data hasil seed)

- [x] Buat branch `feat/landing-builder`. — _dikerjakan di branch `claude/quirky-johnson-w8p8x5` lalu di-merge ke `develop` (ketiga PR digabung sesuai permintaan)_
- [x] `sql/018_create_landing_builder.sql` + tabel di `drizzle/schema.ts` (`landingPage`, `landingPageHistory`) + tipe infer.
- [x] `lib/landing/schema.ts` (Zod `LandingContent` + sub-skema), `lib/landing/defaults.ts` (konten default = isi desain), `lib/landing/format.ts` (`floor_plus`, token `{tahun}`), `lib/landing/links.ts` (resolve `Link` → href, termasuk `auto`).
- [x] `scripts/seed-landing-from-legacy.ts` sesuai pemetaan di Model data; jalankan di DB lokal/staging. — _diganti seed otomatis saat builder pertama dibuka + `POST /api/admin/landing-builder/seed[?force=1]` (pemetaan di `lib/landing/legacy.ts`); idempotent_
- [x] `lib/landing/getPublishedLanding.ts` (cache tag `landing`) + `getDraftLanding()` tanpa cache. — _ada di `lib/landing/repo.ts` (`getPublishedLanding`, `getDraftLanding`)_
- [x] Komponen `components/landing/sections/`: `SiteHeader`, `MobileMenu` (client), `Hero`, `PhoneMockup` (varian `analysis` / `history` / `telegram`), `StatsBand`, `HowItWorks`, `Features`, `Testimonials` (client carousel), `Faq` (client accordion), `CtaDownload`, `StoreBadges`, `SiteFooter`, `SectionRenderer` (mengikuti `order` + `visibility`). — _`PhoneMockup` = `Mockups.tsx`_
- [x] Tulis ulang `app/page.tsx`: pakai `SectionRenderer`, `generateMetadata()` dari `settings.seo`, JSON-LD + `FAQPage`, dukung `draftMode()`. — _dipindah ke `app/(landing)/page.tsx` supaya `loading.tsx` (shimmer) hanya berlaku untuk `/`_
- [x] Adapter `toLegacySectionMap()` untuk `/api/landing-content` & `/api/footer-content`.
- [x] Cocokkan visual dengan `design/01-landing-desktop-1440.png` dan `design/02-landing-mobile-390.png` (breakpoint `lg` = 1024 untuk layout 2 kolom).

**PR 2 — Admin API + Landing Builder**

- [x] Endpoint di `app/api/admin/landing-builder/*` sesuai tabel API (+ `folder` di `upload-image`).
- [x] `lib/landing/diff.ts` (hitung `changes` per section) & `lib/landing/publish.ts` (validasi aturan terbit, hitung statistik, transaksi, `revalidateTag('landing')`, `revalidatePath('/')`). — _aturan terbit di `lib/landing/publish-rules.ts`_
- [x] Tambah dependensi `@dnd-kit/core` + `@dnd-kit/sortable` untuk drag (atau tombol naik/turun bila tidak ingin dependensi baru).
- [x] Rute `app/admin/(panel)/landing/[section]/page.tsx`, `settings/page.tsx`, `layout.tsx` (3 kolom + bar status), redirect `/admin/landing` → `/hero`.
- [x] Komponen `components/admin/landing/`: `SectionList`, `StatusBar`, `PublishModal`, `DiscardModal`, `PreviewPane` (render komponen landing asli dengan data draf, toggle desktop/mobile, outline section aktif), `useDraftAutosave` (debounce 800 ms, revision, 409), `ImageUploader` (generalisasi `HeroImageUploader`), `RepeaterList`, `IconPicker`, `LinkField`, `CharCounter`. — _`useDraftAutosave` = `BuilderContext.tsx`, `RepeaterList` = `SortableList.tsx`, `LinkField`/`CharCounter` di `fields.tsx`_
- [x] 9 form section + Pengaturan global sesuai tabel backoffice dan `design/10–20-*.png`; `TestimonialDrawer`; editor FAQ memakai `RichTextEditor` yang sudah ada (mode ringkas). — _fitur dipindah antar baris lewat tombol “Pindah ke baris N” (drag di dalam baris)_
- [x] Tata letak mobile admin (sheet form + bar bawah).

**PR 3 — Bersih-bersih**

- [x] Hapus `app/admin/(panel)/footer/`, `app/api/admin/footer/`, `app/api/admin/landing/` (lama), form lama di `app/admin/(panel)/landing/page.tsx`.
- [x] Hapus `blog_post`, `SECTION_LABELS`, `syncMetaFields`, textarea Meta JSON.
- [x] `components/admin/shell/nav.ts`: hapus “Footer”. `app/admin/(panel)/page.tsx`: teks kartu + angka statistik.
- [x] `lib/landingContent.ts` lama: hapus setelah semua pemakai pindah ke `lib/landing/*`.
- [x] Update README (bagian Landing Page CMS, struktur direktori, migrasi 018).

**Rilis:** jalankan `018` + seed di staging → QA → production (SQL dulu, lalu deploy). Fase 2 (terpisah): UI riwayat & rollback, hapus tabel `landing_content`, konten dwibahasa.

## Acceptance criteria & QA

Satu fitur dianggap selesai bila skenario di bawah lolos di staging, desktop 1440 dan mobile 390.

| # | Skenario | Hasil yang diharapkan |
| --- | --- | --- |
| 1 | Buka `/` tanpa login | 9 section sesuai desain; tombol “Mulai Sekarang” ke `/login`; Testimoni tidak tampil bila 0 item live |
| 2 | Buka `/` sudah login | Tombol CTA ke `/main/riwayat`, header menampilkan avatar + username |
| 3 | Admin ubah judul Hero, tanpa Terbitkan | Pratinjau di builder berubah; `/` untuk pengunjung **tidak** berubah; chip “Draf · 1 perubahan” |
| 4 | Klik Terbitkan | Modal ringkasan → konfirmasi → `/` berubah ≤ 5 detik; baris baru di `landing_page_history`; chip jadi “Tayang” |
| 5 | Buang draf | Draf kembali sama dengan tayang; chip “Tayang” |
| 6 | Sembunyikan FAQ lalu terbitkan | Section & menu FAQ hilang; JSON-LD `FAQPage` tidak dikirim |
| 7 | Urutkan ulang section via drag lalu terbitkan | Urutan di `/` ikut berubah; Header & Footer tetap di tempat |
| 8 | Testimoni status live tanpa centang izin | Tidak bisa disimpan sebagai live (error inline); Terbitkan ditolak dengan pesan per item |
| 9 | Deskripsi SEO > 160 karakter | Counter merah + Terbitkan ditolak |
| 10 | Statistik otomatis “Jumlah user aktif” | Nilai = hasil hitung saat terbit, format `12.000+`; tidak ada query hitung saat halaman dibuka |
| 11 | URL App Store kosong / switch off | Badge App Store tidak tampil di Hero & CTA |
| 12 | Dua tab admin mengedit bersamaan | Tab kedua dapat `409` → pesan “Diubah admin lain, muat ulang”; tidak ada data yang tertimpa diam-diam |
| 13 | Buka pratinjau draf | Banner “Mode pratinjau draf” + `noindex`; pengunjung biasa tidak bisa mengaktifkan mode ini |
| 14 | DB tidak bisa diakses | `/` tetap tampil dengan konten fallback, error tercatat di log |
| 15 | `GET /api/landing-content` & `/api/footer-content` | Bentuk JSON sama seperti sebelum migrasi (bandingkan snapshot) |
| 16 | Endpoint builder tanpa cookie admin | `401` |
| 17 | Menu admin | Tidak ada “Footer”, “Blog Post”, field Body, atau textarea JSON di mana pun |

**Checklist teknis:**

- [ ] Lighthouse mobile `/`: Performance ≥ 90, Accessibility ≥ 95, SEO 100.
- [ ] Tidak ada layout shift saat client island (carousel, accordion, nav auth) terhidrasi.
- [ ] Keyboard: Tab melewati menu, tombol, accordion, carousel secara berurutan; fokus terlihat.
- [x] `prefers-reduced-motion` mematikan autoplay carousel.
- [x] Unit test Zod (`schema.test.ts`), `floor_plus`, `diff`, `toLegacySectionMap` (snapshot) — tambahkan Vitest bila belum ada. — _`lib/landing/landing.test.ts`, `npm test`_
- [x] Seed idempotent: dijalankan 2× tidak menggandakan data.

## Risiko & keputusan terbuka

| Risiko | Dampak | Mitigasi |
| --- | --- | --- |
| Klien lain (mis. gizku-mobile) memakai `/api/landing-content` atau `/api/footer-content` | Tampilan klien rusak setelah migrasi | Adapter bentuk lama + snapshot test (#15); cek pemakaian di repo gizku-mobile sebelum PR 1 |
| Klaim angka manual (“95% akurasi”) tanpa dasar data | Risiko reputasi & perlindungan konsumen | Peringatan di builder; sebaiknya diganti metrik otomatis atau dihapus |
| Testimoni tanpa izin pengguna | Masalah privasi | Checkbox izin wajib + simpan `consentAt`; jangan pakai placeholder desain di produksi |
| Badge store tampil sebelum app rilis | Tautan mati | Badge hanya tampil jika switch on + URL terisi (default off) |
| Dokumen JSON membesar / skema berubah | Data lama gagal validasi | Kolom `schema_version` + fungsi migrasi Zod `upgrade(v1→v2)` saat baca |
| Dua admin mengedit bersamaan | Perubahan tertimpa | Optimistic lock `revision` + `409` |
| Cache tidak ter-purge setelah terbit | Konten lama tampil | `revalidateTag('landing')` + `revalidatePath('/')`; endpoint publik tetap `no-store` seperti sekarang |

**Keputusan terbuka (perlu jawaban Aji sebelum/selama PR):**

- [x] Jawaban FAQ #2–#5 (akurasi, Telegram, keamanan data, bahasa) — ditulis siapa? Sampai ada, status draft. — _draf jawaban sudah ditulis (status Draf) — perlu direview lalu diubah ke Tayang di builder_
- [ ] Tetap tampilkan “95% Akurasi Pengenalan”? Jika ya, dasar datanya apa.
- [ ] Status rilis gizku-mobile di App Store / Google Play (menentukan default badge).
- [ ] Username bot Telegram & akun sosial media resmi untuk footer.
- [ ] Email support final untuk tombol “Hubungi Kami” (desain memakai `support@gizku.com`).
- [x] Pakai `@dnd-kit` (dependensi baru) atau cukup tombol naik/turun. — _dipilih @dnd-kit; mobile memakai mode “Urutkan” naik/turun_

**Catatan:** hanya ada satu peran admin saat ini, jadi tidak ada alur approval; semua admin boleh menerbitkan. Nama admin dari JWT disimpan di `updated_by` / `published_by`.

## Memulai di Claude Code

Prompt siap tempel ada di `docs/handoff/CLAUDE-CODE-PROMPT.md`. Langkah lengkapnya ada di `README.md` pada root paket zip.

Tip: minta Claude Code mencentang task di dokumen ini setiap kali selesai, supaya progres terlihat di PR.
