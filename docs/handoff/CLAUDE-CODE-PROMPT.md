# Prompt untuk Claude Code

Tempel blok di bawah ke Claude Code untuk PR 1. Setelah PR 1 di-merge, ulangi dengan mengganti "PR 1 — Data layer + landing publik" menjadi "PR 2 — Admin API + Landing Builder", lalu "PR 3 — Bersih-bersih".

```text
Kamu akan mengimplementasikan redesign landing page + Landing Builder Gizku.

Baca dulu, lengkap:
- docs/handoff/landing-builder.md (spesifikasi utama, ikuti persis)
- docs/handoff/design/*.png (acuan visual; cocokkan spacing, warna, tipografi)
- docs/handoff/design-source/*.dc.html (HTML sumber desain; boleh dibaca untuk
  angka persis padding/ukuran/warna, JANGAN disalin mentah ke kode — ubah ke
  Tailwind + token yang sudah ada)
- README.md, app/page.tsx, lib/landingContent.ts, drizzle/schema.ts,
  app/admin/(panel)/landing/page.tsx, components/admin/ui/*, lib/admin.ts

Kerjakan HANYA "PR 1 — Data layer + landing publik" dari bagian
"Fase implementasi & task untuk Claude Code".

Aturan:
- Pakai token Tailwind/CSS variable yang sudah ada; jangan menambah hex baru.
- Migrasi DB sebagai file SQL bernomor di sql/ + sinkronkan drizzle/schema.ts.
- Validasi semua konten dengan Zod di lib/landing/schema.ts.
- Jangan hapus tabel landing_content dan jangan ubah bentuk respons
  /api/landing-content maupun /api/footer-content.
- Server component untuk konten; client component hanya untuk interaksi.
- Setelah selesai jalankan npm run typecheck, npm run lint, npm run build
  dan perbaiki semua error.

Sebelum menulis kode: tampilkan rencana singkat (daftar file yang dibuat/diubah)
dan pertanyaan bila ada bagian spesifikasi yang ambigu. Tunggu konfirmasi saya.
Setelah selesai: ringkas perubahan, cara menjalankan seed, dan skenario
Acceptance yang sudah bisa diuji. Centang task yang selesai di
docs/handoff/landing-builder.md.
```
