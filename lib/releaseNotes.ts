/**
 * Sumber tunggal daftar fitur & release notes Gizku (web + mobile), ditampilkan di
 * backoffice: /admin/releases.
 *
 * ATURAN (lihat CLAUDE.md): setiap merge ke `main` / deploy production WAJIB
 *   1. menambah entry baru di `releases` platform yang berubah (terbaru di paling atas),
 *   2. menaikkan versi (semver) — web: `package.json`, mobile: `app.config.ts` + `package.json`
 *      di repo gizku-mobile — supaya sama dengan entry teratas,
 *   3. memperbarui `features` bila ada fitur baru / berubah / dihapus.
 * `lib/releaseNotes.test.ts` memeriksa konsistensinya.
 */

export type Platform = 'web' | 'mobile'
export type ChangeType = 'feat' | 'fix' | 'improve' | 'chore'

export type ReleaseChange = { type: ChangeType; text: string }

export type Release = {
  /** Semver tanpa prefix "v", mis. "1.7.3". */
  version: string
  /** Tanggal ISO (YYYY-MM-DD). */
  date: string
  /**
   * 'unreleased' = sudah di `main` tapi belum dirilis ke store (khusus mobile; web otomatis
   * rilis saat merge ke main karena Vercel deploy production).
   */
  status?: 'released' | 'unreleased'
  note?: string
  changes: ReleaseChange[]
}

export type FeatureGroup = { group: string; items: { name: string; description: string }[] }

export const PLATFORM_LABEL: Record<Platform, string> = { web: 'Web', mobile: 'Mobile App' }

export const FEATURES: Record<Platform, FeatureGroup[]> = {
  web: [
    {
      group: 'Pengguna',
      items: [
        { name: 'Analisa foto makanan', description: 'Upload/kamera, AI (Anthropic Claude) mendeteksi makanan beserta kalori, protein, karbo, dan lemak. Kuota harian hanya terpotong jika analisa berhasil.' },
        { name: 'Riwayat & statistik', description: 'Rekap harian/mingguan, ringkasan nutrisi per hari, edit hasil analisa. Filter per tanggal atau jendela N hari terakhir.' },
        { name: 'Autentikasi', description: 'Login/register JWT custom; wajib setuju Syarat & Ketentuan + Kebijakan Privasi saat register; email palsu/sementara (example.com, mailinator, dll.) ditolak saat daftar & ganti email.' },
        { name: 'Reset & ubah password, ubah email', description: 'Dari Settings; admin bisa reset password user (user dipaksa ganti password di login berikutnya).' },
        { name: 'Dwibahasa (Indonesia/English)', description: 'UI, hasil analisa AI, dan konten legal dalam dua bahasa.' },
        { name: 'Request Kenaikan Limit Analisa', description: 'Ajukan tambahan kuota harian via transfer bank manual (tier, kode unik, bukti transfer) + ledger penggunaan.' },
        { name: 'Integrasi Telegram Bot', description: 'Hubungkan akun via OTP 6 digit, kirim foto ke bot untuk dianalisa dan tercatat ke riwayat.' },
        { name: 'Halaman legal publik', description: '/legal/[slug] — Syarat & Ketentuan, Kebijakan Privasi, dokumen custom, dwibahasa.' },
        { name: 'Landing page', description: 'Landing publik 9 section (Hero, Statistik, Cara Kerja, Fitur, Testimoni, FAQ, CTA & Download, Footer) dengan SEO.' },
        { name: 'Maintenance mode aware', description: 'User aktif otomatis logout & diarahkan ke halaman maintenance saat mode pemeliharaan aktif.' },
      ],
    },
    {
      group: 'Backoffice',
      items: [
        { name: 'Dashboard admin', description: 'Statistik ringkasan, status sistem, recent users, badge laporan open & request limit.' },
        { name: 'Manajemen user', description: 'CRUD, aktif/nonaktif, ubah daily limit, reset password (audit trail).' },
        { name: 'Riwayat analisa user', description: 'Lihat riwayat makanan per user.' },
        { name: 'Landing Builder', description: 'Atur 9 section landing + pengaturan global tanpa deploy; drag urutan, pratinjau desktop/mobile, alur Draf → Terbitkan, riwayat terbitan.' },
        { name: 'Dokumen legal', description: 'Rich text editor dwibahasa untuk Syarat & Ketentuan, Kebijakan Privasi, dan tipe custom.' },
        { name: 'Review Request Limit', description: 'Approve/reject pengajuan (alasan reject terstruktur), konfigurasi tier & rekening tujuan.' },
        { name: 'Blast Notifikasi', description: 'Broadcast via push (Expo), Telegram, atau email ke semua/user tertentu; terjadwal; tracking per penerima; duplikat blast & kirim ulang yang gagal. Push dwibahasa dengan gambar banner, ikon, tujuan ketuk (detail/halaman/tautan web), dan mode senyap; selalu masuk inbox user.' },
        { name: 'Whitelist Domain', description: 'Daftar domain yang boleh dibuka sebagai tautan web di blast push (gizku.com default). Divalidasi di form, server, dan saat blast terjadwal dikirim.' },
        { name: 'Telegram Bot', description: 'Konfigurasi & statistik bot dari backoffice.' },
        { name: 'Laporan & Helpdesk', description: 'Satu inbox untuk laporan in-app dan email masuk; balas dari backoffice, pipeline 4 status.' },
        { name: 'Pengaturan sistem', description: 'Limit global, API key, model AI, verifikasi email, maintenance, Closed Beta — setiap simpan wajib konfirmasi password admin.' },
        { name: 'Rilis & Fitur', description: 'Daftar fitur dan release notes web + mobile beserta versinya (halaman ini).' },
      ],
    },
    {
      group: 'Infrastruktur',
      items: [
        { name: 'Supabase', description: 'PostgreSQL (Drizzle ORM) + Storage untuk file upload.' },
        { name: 'Cron job', description: 'send-scheduled-blasts, prune-old-usage & prune-notifications, dipicu lewat cron-job.org.' },
        { name: 'Vercel Analytics & Speed Insights', description: 'Page view dan web vitals otomatis. Merge ke main = deploy production.' },
        { name: 'CORS global', description: 'Middleware untuk semua /api/* agar bisa diakses aplikasi mobile.' },
      ],
    },
  ],
  mobile: [
    {
      group: 'Akun & Keamanan',
      items: [
        { name: 'Registrasi / Login / Logout', description: 'Sama seperti web, termasuk checkbox wajib persetujuan Syarat & Ketentuan + Kebijakan Privasi.' },
        { name: 'Ubah password & email, lupa password', description: 'Dari halaman Pengaturan.' },
        { name: 'Foto aman saat sesi habis', description: 'Jika sesi login habis saat memotret/menganalisa, foto otomatis disimpan sebagai draft dan menunggu setelah login ulang.' },
        { name: 'Maintenance mode', description: 'Akses diblokir total saat backoffice mengaktifkan mode pemeliharaan.' },
      ],
    },
    {
      group: 'Analisa & Riwayat',
      items: [
        { name: 'Scan makanan', description: 'Kamera atau galeri, dianalisa AI (Claude lewat API gizku-web).' },
        { name: 'Edit hasil analisa', description: 'Koreksi teks untuk re-analisa, atau edit manual per menu.' },
        { name: 'Auto-save ke riwayat', description: 'Dengan status tersimpan yang jujur (Menyimpan / Tersimpan / Gagal, ketuk untuk coba lagi). Tanggal riwayat mengikuti waktu foto diambil.' },
        { name: 'Simpan sebagai Draft', description: 'Analisa gagal karena koneksi/server: foto disimpan di perangkat (maks. 3, yang terlama diganti) dan bisa dianalisa ulang dari Riwayat tanpa foto ulang.' },
        { name: 'Riwayat', description: 'Filter Semua/Draft, kalender pilih tanggal, mode 10 hari terakhir, pagination 10 per halaman, shimmer loading, sumber (app/web/Telegram).' },
      ],
    },
    {
      group: 'Limit & Integrasi',
      items: [
        { name: 'Request Kenaikan Limit Analisa', description: 'Pilih paket, kode unik, upload bukti transfer; lihat status & ledger penggunaan.' },
        { name: 'Koneksi Telegram', description: 'Generate kode OTP, link/unlink; foto yang dikirim ke bot tercatat ke riwayat.' },
        { name: 'Push notification', description: 'Terima blast dari admin; registrasi token otomatis, tracking klik/dibaca.' },
        { name: 'Halaman Notifikasi (inbox)', description: 'Ikon lonceng di header dengan badge belum dibaca. Inbox dari server (sinkron antar perangkat): grup tanggal, filter belum dibaca, swipe tandai dibaca/belum dibaca, Baca semua + Urungkan, banner bila push dimatikan. Tautan web dibuka di webview dalam app (dibatasi whitelist domain). Notifikasi >3 bulan dihapus otomatis.' },
      ],
    },
    {
      group: 'Lainnya',
      items: [
        { name: 'Dwibahasa (Indonesia/English)', description: 'Seluruh UI, hasil analisa AI, dan konten legal mengikuti bahasa di Pengaturan.' },
        { name: 'Dokumen legal & Tentang Aplikasi', description: 'Syarat & Ketentuan, Kebijakan Privasi, dokumen custom dari backoffice.' },
        { name: 'Kirim laporan / masukan', description: 'Dari Pengaturan, masuk ke Laporan & Helpdesk backoffice.' },
        { name: 'Analytics', description: 'Google Analytics 4 (Measurement Protocol) dengan parameter platform android/ios.' },
      ],
    },
  ],
}

export const RELEASES: Record<Platform, Release[]> = {
  web: [
    {
      version: '1.10.0',
      date: '2026-11-12',
      note: 'Jalankan sql/019_notification_inbox.sql sebelum deploy. Jika cron dijalankan lewat cron-job.org, tambahkan juga /api/cron/prune-notifications (harian).',
      changes: [
        { type: 'feat', text: 'Inbox notifikasi per user: setiap blast Push kini tersimpan ke inbox di server untuk semua target aktif (termasuk yang belum punya push token atau mematikan push). Status dibaca tersimpan di server. API baru: GET/POST /api/notifications (daftar + cursor, detail, unread_count, read, read_all, whitelist). Notifikasi lebih dari 90 hari tidak tampil dan dihapus cron prune-notifications.' },
        { type: 'feat', text: 'Blast Push v2: konten dwibahasa (ID wajib, EN opsional; user EN menerima versi ID bila EN kosong), gambar besar untuk banner push, ikon khusus (default logo Gizku), tujuan saat diketuk (detail notifikasi / halaman di app / tautan web di webview), dan mode kirim "Banner push + halaman Notifikasi" atau "Halaman Notifikasi saja (senyap)".' },
        { type: 'feat', text: 'Backoffice: menu baru Blast Notifikasi › Whitelist Domain. Tautan web di blast hanya boleh ke domain di daftar (gizku.com + subdomain default, tidak bisa dihapus); divalidasi langsung di form, di server saat dibuat, dan lagi saat cron mengirim blast terjadwal (dibatalkan dengan alasan bila domain sudah dihapus).' },
        { type: 'improve', text: 'Form Buat Blast: tab bahasa, pratinjau banner Android + baris halaman Notifikasi dengan toggle ID/EN, estimasi dipecah "Masuk halaman Notifikasi" dan "Dapat banner push". User tanpa push token tidak lagi dihitung gagal (status penerima baru "Hanya inbox") dan masuk hitungan Terkirim.' },
        { type: 'improve', text: 'Push dikirim sesuai bahasa app di perangkat: push_tokens.language diisi saat register dan diperbarui lewat POST /api/push?action=language. Payload push kini membawa notificationId, linkType, dan linkValue. Mobile lama tanpa update tetap aman (field baru opsional).' },
        { type: 'improve', text: 'read_count blast naik saat user membaca di halaman Notifikasi app (sekali per user), menggantikan ack read.' },
      ],
    },
    {
      version: '1.9.1',
      date: '2026-11-12',
      changes: [
        { type: 'improve', text: 'Landing page: judul utama (hero) di layar HP diperkecil dari 36px ke 30px agar lebih proporsional; tablet dan desktop tidak berubah.' },
      ],
    },
    {
      version: '1.9.0',
      date: '2026-11-12',
      changes: [
        { type: 'feat', text: 'Daftar akun dan ganti email menolak alamat email palsu/sementara: domain contoh (example.com/.net/.org, test.com, testing.com, email.com beserta subdomainnya), TLD cadangan (.test, .example, .invalid, .localhost, .local), dan ±120 ribu penyedia email sekali pakai (mailinator, yopmail, 10minutemail, …). Akun lama tidak diubah.' },
        { type: 'improve', text: 'POST /api/auth?action=register dan /api/user?action=update_email mengembalikan `code: "email_not_allowed"` untuk email yang ditolak, sehingga pesan tampil sesuai bahasa. Aplikasi mobile tetap aman tanpa update: field `error` berisi pesan Bahasa Indonesia.' },
      ],
    },
    {
      version: '1.8.0',
      date: '2026-11-12',
      changes: [
        { type: 'feat', text: 'Backoffice: halaman baru Rilis & Fitur (menu Sistem) berisi daftar fitur dan release notes untuk Web dan Mobile App, lengkap dengan versi, status rilis, dan commit yang sedang ter-deploy.' },
        { type: 'chore', text: 'Aturan rilis: setiap merge ke main wajib memperbarui release notes + versi (CLAUDE.md, template PR, dan test konsistensi versi). package.json disinkronkan ke versi rilis (sebelumnya 1.2.0).' },
      ],
    },
    {
      version: '1.7.3',
      date: '2026-10-13',
      changes: [
        { type: 'fix', text: 'Riwayat makanan kini tercatat di tanggal foto diambil, bukan tanggal data berhasil disimpan. Sebelumnya draft yang dianalisa ulang di hari lain, atau simpan yang di-retry setelah upload gagal, masuk ke tanggal retry sehingga total kalori/nutrisi harian user keliru. POST /api/history menerima field opsional `loggedAt`.' },
        { type: 'improve', text: 'Pengaman duplikat simpan (hash gambar) tetap bekerja untuk retry/draft: dengan `loggedAt` mundur, pencocokan melebar dari 60 detik menjadi seluruh riwayat user untuk gambar yang sama.' },
        { type: 'feat', text: 'GET /api/history?action=list menerima `days` (jendela N hari terakhir sampai hari ini), dipakai mode "10 hari terakhir" di aplikasi mobile.' },
      ],
    },
    {
      version: '1.7.2',
      date: '2026-09-30',
      changes: [
        { type: 'fix', text: 'Email blast dibatasi maks. 10 request/detik ke Resend (sliding window); jika tetap 429, dicoba ulang otomatis hingga 3× (jeda 1s/2s/4s). Kapasitas ±500 email per eksekusi.' },
        { type: 'feat', text: 'Duplikat Blast: tombol "Duplikat" di Riwayat & Detail Batch; penerima bisa semua, kecualikan yang gagal, atau hanya yang gagal. Tombol "Kirim Ulang yang Gagal (N)".' },
      ],
    },
    {
      version: '1.7.1',
      date: '2026-09-29',
      changes: [
        { type: 'improve', text: 'Pengirim email promosional kini Gizku Connect <connect@gizku.com>; link "hubungi kami" mengarah ke support@gizku.com.' },
        { type: 'feat', text: 'Email blast: gambar yang disisipkan bisa diberi URL tujuan.' },
        { type: 'feat', text: 'Telegram blast: bisa kirim gambar (maks. 10; 1 gambar sebagai foto, 2+ sebagai album, teks jadi caption hingga 1.024 karakter).' },
      ],
    },
    {
      version: '1.7.0',
      date: '2026-09-28',
      changes: [
        { type: 'feat', text: 'Landing page baru bergaya Nova (9 section) dengan Testimoni, FAQ (JSON-LD FAQPage), CTA & Download; SEO diatur dari backoffice.' },
        { type: 'feat', text: 'Landing Builder menggantikan /admin/landing: drag urutan, switch tampil, pratinjau desktop/mobile, alur Draf → Terbitkan, statistik otomatis, riwayat terbitan. Migrasi DB sql/018.' },
        { type: 'improve', text: 'Semua loading state memakai skeleton shimmer; sosial media di footer tampil sebagai logo.' },
        { type: 'chore', text: 'Dihapus: halaman /admin/footer, section blog_post, /api/admin/landing & /api/admin/footer.' },
      ],
    },
    {
      version: '1.6.0',
      date: '2026-08-06',
      changes: [
        { type: 'feat', text: 'Request Kenaikan Limit Analisa (tier, kode unik, bukti transfer, approve/reject) + ledger limit terpusat.' },
        { type: 'feat', text: 'Integrasi Telegram Bot (grammY): /start, /help, /today, /link; linking via OTP 6 digit.' },
        { type: 'feat', text: 'Notification Blast (Push & Telegram) dengan penjadwalan dan tracking per penerima.' },
        { type: 'feat', text: 'Legal Document Configuration & Footer CMS, halaman publik /legal/[slug].' },
        { type: 'feat', text: 'Dwibahasa Indonesia/English di seluruh halaman user-facing.' },
        { type: 'improve', text: 'Checkbox persetujuan Syarat & Ketentuan + Kebijakan Privasi wajib dicentang saat register.' },
        { type: 'chore', text: 'StagingBanner, cron prune-old-usage, ubah email, response API disederhanakan, cron dipindah ke cron-job.org.' },
      ],
    },
    {
      version: '1.5.1',
      date: '2026-05-22',
      changes: [{ type: 'fix', text: 'Label tombol CTA di hero landing selalu mengikuti konfigurasi CMS, tidak di-override status login.' }],
    },
    {
      version: '1.5.0',
      date: '2026-05-22',
      changes: [
        { type: 'feat', text: 'Reset password oleh admin + paksa ganti password di login berikutnya, dengan audit trail.' },
        { type: 'feat', text: 'Upload hero image drag-and-drop ke Supabase Storage.' },
        { type: 'feat', text: 'Landing page CMS (hero, how_it_works, features, stats, CTA) via backoffice.' },
        { type: 'improve', text: 'Komponen GizkuLogo terpusat dan backoffice responsif untuk mobile.' },
      ],
    },
    {
      version: '1.4.0',
      date: '2026-05-03',
      changes: [
        { type: 'improve', text: 'Rebrand NutriLog → Gizku (UI, metadata, dokumentasi) dan custom domain.' },
        { type: 'feat', text: 'Widget pengumuman rebrand yang bisa ditutup.' },
      ],
    },
    {
      version: '1.3.0',
      date: '2026-04-26',
      changes: [
        { type: 'feat', text: 'Validasi gambar non-makanan: AI menolak dengan 422 dan kuota tidak terpotong.' },
        { type: 'improve', text: 'Error handling AI (overloaded, rate limit, invalid key, timeout) dengan pesan ramah; validasi token saat app load dan auto-logout global saat 401.' },
      ],
    },
    {
      version: '1.2.0',
      date: '2026-04-18',
      changes: [
        { type: 'chore', text: 'Vercel Analytics.' },
        { type: 'improve', text: 'Auto-logout maintenance dan banner di login.' },
      ],
    },
    { version: '1.1.0', date: '2026-04-17', changes: [{ type: 'chore', text: 'Migrasi data dari Supabase KV Store ke PostgreSQL.' }] },
    {
      version: '1.0.0',
      date: '2026-04-10',
      changes: [{ type: 'feat', text: 'Rilis awal (NutriLog): analisa foto, riwayat, autentikasi JWT, admin dashboard, dark/light mode, PWA-ready.' }],
    },
  ],
  mobile: [
    {
      version: '1.2.0',
      date: '2026-11-12',
      status: 'unreleased',
      note: 'Gabungan perubahan di main sejak v1.1.0. Tandai sebagai released setelah build ini naik ke Play Store / App Store.',
      changes: [
        { type: 'feat', text: 'Halaman Notifikasi (ikon lonceng di header Riwayat): inbox blast dari Gizku dengan badge belum dibaca, grup tanggal, filter, swipe tandai dibaca/belum dibaca, Baca semua + Urungkan, dan banner saat push dimatikan. Ketuk notifikasi (juga dari banner push) menandai dibaca dan membuka tujuannya: detail, halaman di app, atau tautan web di webview dalam app. Butuh backend web ≥ 1.10.0.' },
        { type: 'improve', text: 'Push mengikuti bahasa app (ID/EN) dan warna ikon notifikasi Android disesuaikan ke hijau Gizku baru. Butuh backend web ≥ 1.10.0.' },
        { type: 'feat', text: 'Simpan sebagai Draft: foto yang gagal dianalisa karena koneksi atau server disimpan di perangkat (maks. 3, yang terlama diganti) dan bisa dianalisa ulang dari Riwayat, dengan tombol Analisa Sekarang / Hapus Draft.' },
        { type: 'feat', text: 'Sesi login habis saat memotret/menganalisa: foto otomatis disimpan sebagai draft (alasan "Sesi berakhir") dan menunggu setelah login ulang, tidak perlu foto ulang.' },
        { type: 'feat', text: 'Riwayat: filter Semua/Draft, section Draft, kalender pilih tanggal baru (OK/Clear/Batal), mode "10 Hari Terakhir", pagination ikon 10 per halaman. Butuh backend web ≥ 1.7.3.' },
        { type: 'improve', text: 'Pesan error analisa dibedakan: "Koneksi terputus" (ikon wifi-off) vs "Server sedang sibuk", dwibahasa.' },
        { type: 'fix', text: 'Tanggal riwayat mengikuti waktu foto diambil, bukan waktu simpan: draft yang dianalisa ulang di hari lain atau simpan yang di-retry setelah upload gagal tidak lagi salah hari. Butuh backend web ≥ 1.7.3.' },
        { type: 'fix', text: 'Baris filter Riwayat tidak lagi turun ke baris baru pada label "Hari ini" bahasa Indonesia.' },
        { type: 'fix', text: 'Password tetap terlihat setelah toggle sembunyikan di Android.' },
        { type: 'fix', text: 'Hapus izin READ_MEDIA_IMAGES agar lolos kebijakan photo picker Google Play; aktifkan R8/ProGuard untuk app optimization Play Console.' },
        { type: 'improve', text: 'Logo Gizku baru (progress ring + macro pie).' },
        { type: 'chore', text: 'Google Analytics 4 via Measurement Protocol dengan parameter platform (android/ios).' },
      ],
    },
    {
      version: '1.1.0',
      date: '2026-08-06',
      status: 'released',
      changes: [
        { type: 'improve', text: 'Checkbox persetujuan Syarat & Ketentuan + Kebijakan Privasi wajib dicentang saat registrasi, dengan tautan ke halaman legal.' },
        { type: 'feat', text: 'Request Kenaikan Limit Analisa: ajukan kuota via transfer bank manual, lihat status & ledger dari Pengaturan.' },
        { type: 'feat', text: 'Konfigurasi koneksi Telegram dari Pengaturan (link/unlink via kode OTP).' },
        { type: 'feat', text: 'Push notification: registrasi token otomatis saat login, terima & ack blast dari admin.' },
        { type: 'feat', text: 'Dwibahasa (Indonesia/English) di seluruh UI, hasil analisa AI, dan konten legal.' },
        { type: 'feat', text: 'Halaman dokumen legal dwibahasa (/legal/[slug]) dan layar Tentang Aplikasi dari konten backoffice.' },
      ],
    },
    {
      version: '1.0.0',
      date: '2026-07-03',
      status: 'released',
      note: 'Tanggal = commit awal repo gizku-mobile; tanggal rilis store tidak tercatat di repo.',
      changes: [
        { type: 'feat', text: 'Aplikasi native iOS & Android (React Native + Expo): login/registrasi, scan makanan via kamera/galeri, hasil analisa AI dengan edit/koreksi, auto-save ke riwayat.' },
        { type: 'feat', text: 'Riwayat dengan filter tanggal, pagination, dan pembeda sumber (app/web/Telegram); halaman Pengaturan, ubah password & email, maintenance mode.' },
        { type: 'improve', text: 'Gizku Design System; perbaikan bug filter tanggal riwayat (UTC vs hari lokal).' },
      ],
    },
  ],
}

export function latestRelease(platform: Platform): Release {
  return RELEASES[platform][0]
}
