/**
 * Default landing document = the copy from the redesign handoff
 * (docs/handoff/design/01-landing-desktop-1440.png).
 *
 * Used (1) to fill sections that have no legacy landing_content rows when the
 * builder is seeded, and (2) as the render fallback when the DB is
 * unreachable. Keep it valid against `LandingContent` (see schema.test.ts).
 */
import { SECTION_KEYS, type LandingContent } from './schema'

export const DEFAULT_SEO_TITLE = 'Gizku — Analisa Nutrisi Makanan dengan AI'
export const DEFAULT_SEO_DESCRIPTION = 'Cukup foto makananmu — Gizku langsung kenali isinya dan hitung kalori, protein, lemak, dan karbohidrat secara otomatis. Gratis, tanpa perlu mencatat manual.'
export const DEFAULT_SUPPORT_EMAIL = 'support@gizku.com'

export const DEFAULT_CONTENT: LandingContent = {
  order: [...SECTION_KEYS],
  visibility: {
    hero: true, stats: true, howItWorks: true, features: true,
    // No real, consented testimonials yet — hidden until there's ≥1 live item.
    testimonials: false,
    faq: true, cta: true,
  },
  settings: {
    ctaUrlGuest: '/login',
    ctaUrlAuth: '/main/riwayat',
    stores: {
      // Off until gizku-mobile is actually live in the stores (no dead links).
      appStore: { enabled: false, url: '' },
      googlePlay: { enabled: false, url: '' },
      telegram: { enabled: false, url: '' },
    },
    seo: { title: DEFAULT_SEO_TITLE, description: DEFAULT_SEO_DESCRIPTION, ogImageUrl: null },
  },
  header: {
    brandName: 'Gizku',
    logoUrl: null,
    nav: [
      { id: 'nav_fitur', label: 'Fitur', target: { kind: 'section', section: 'features' }, active: true },
      { id: 'nav_cara', label: 'Cara Kerja', target: { kind: 'section', section: 'howItWorks' }, active: true },
      { id: 'nav_testi', label: 'Testimoni', target: { kind: 'section', section: 'testimonials' }, active: true },
      { id: 'nav_faq', label: 'FAQ', target: { kind: 'section', section: 'faq' }, active: true },
    ],
    button: { label: 'Buka Aplikasi', target: { kind: 'auto' } },
    sticky: true,
  },
  hero: {
    eyebrow: 'AI Nutrition Companion',
    title: 'Kenali Isi Piringmu,\nTanpa Ribet Mencatat',
    subtitle: 'Cukup foto makananmu — Gizku langsung kenali isinya dan hitung kalori, protein, lemak, dan karbo.',
    primary: { label: 'Mulai Sekarang', target: { kind: 'auto' } },
    secondary: { label: 'Lihat Cara Kerja', target: { kind: 'section', section: 'howItWorks' } },
    benefits: ['Gratis selamanya', 'Tanpa kartu kredit', 'Langsung bisa dipakai'],
    visual: { kind: 'analysis', imageUrl: null },
    showStoreBadges: true,
  },
  stats: {
    intro: 'Dipakai setiap hari untuk memahami isi piring.',
    band: 'green',
    items: [
      { id: 'stat_users', source: 'auto', metric: 'users_active', format: 'floor_plus', value: '', label: 'Pengguna Aktif', resolvedValue: null },
      { id: 'stat_meals', source: 'auto', metric: 'meals_total', format: 'floor_plus', value: '', label: 'Makanan Tercatat', resolvedValue: null },
      { id: 'stat_accuracy', source: 'manual', metric: null, format: 'full', value: '95%', label: 'Akurasi Pengenalan', resolvedValue: null },
    ],
  },
  howItWorks: {
    eyebrow: 'Cara Kerja',
    title: 'Semudah 3 Langkah',
    subtitle: 'Tidak perlu input manual. Foto, analisa, selesai — sesantai itu.',
    showNumbers: true,
    items: [
      { id: 'step_foto', icon: 'camera', title: 'Foto Makanan', description: 'Ambil foto makananmu langsung dari kamera atau galeri.' },
      { id: 'step_analisa', icon: 'sparkle', title: 'AI Analisa', description: 'AI kami mengenali makanan dan menghitung nutrisinya secara otomatis.' },
      { id: 'step_pantau', icon: 'chart', title: 'Pantau Progres', description: 'Lihat ringkasan harian dan pantau progresmu dari waktu ke waktu.' },
    ],
  },
  features: {
    eyebrow: 'Fitur Unggulan',
    title: 'Semua yang Kamu Butuhkan',
    subtitle: 'Dirancang supaya mudah memantau asupan nutrisi sehari-hari, tanpa ribet.',
    rows: [
      {
        visual: { kind: 'history', imageUrl: null },
        items: [
          { id: 'feat_scan', icon: 'scan', title: 'Scan & Catat dalam Detik', description: 'Cukup foto, AI langsung kenali makanan dan hitung nutrisinya otomatis.' },
          { id: 'feat_history', icon: 'history', title: 'Riwayat Lengkap', description: 'Lihat semua catatan makan harianmu dalam tampilan yang rapi.' },
          { id: 'feat_insight', icon: 'bolt', title: 'Insight Nutrisi', description: 'Pahami pola makanmu dengan ringkasan mingguan dan bulanan.' },
        ],
      },
      {
        visual: { kind: 'telegram', imageUrl: null },
        items: [
          { id: 'feat_telegram', icon: 'send', title: 'Kirim Foto lewat Telegram', description: 'Hubungkan akunmu, lalu kirim foto makanan ke bot Gizku — hasilnya otomatis tercatat di riwayat.' },
          { id: 'feat_bahasa', icon: 'globe', title: 'Dua Bahasa', description: 'Tampilan dan hasil analisa tersedia dalam Bahasa Indonesia dan English.' },
        ],
      },
    ],
  },
  testimonials: {
    eyebrow: 'Testimoni',
    title: 'Kata Mereka tentang Gizku',
    subtitle: 'Cerita pengguna yang mulai lebih tenang memahami isi piringnya.',
    autoplay: true,
    showRating: true,
    items: [],
  },
  faq: {
    eyebrow: 'FAQ',
    title: 'Pertanyaan yang Sering Diajukan',
    subtitle: 'Belum menemukan jawabanmu? Tim kami siap bantu.',
    contact: { label: 'Hubungi Kami', target: { kind: 'external', url: `mailto:${DEFAULT_SUPPORT_EMAIL}` } },
    items: [
      {
        id: 'faq_gratis', question: 'Apakah Gizku gratis?', openDefault: true, status: 'live',
        answerHtml: '<p>Ya. Kamu bisa menganalisa foto makanan setiap hari tanpa biaya, sesuai kuota harian. Kalau butuh lebih, ajukan kenaikan limit langsung dari aplikasi.</p>',
      },
      // Draft answers — review, then switch to "Tayang" in the builder.
      {
        id: 'faq_akurasi', question: 'Seberapa akurat hasil analisanya?', openDefault: false, status: 'draft',
        answerHtml: '<p>Gizku memakai AI untuk mengenali makanan dan memperkirakan kalori serta makronya dari foto. Hasilnya berupa estimasi — akurasinya dipengaruhi kejelasan foto dan porsi. Kamu selalu bisa mengoreksi hasil analisa di riwayat.</p>',
      },
      {
        id: 'faq_telegram', question: 'Bisakah saya memakai Gizku lewat Telegram?', openDefault: false, status: 'draft',
        answerHtml: '<p>Bisa. Hubungkan akunmu di <strong>Pengaturan → Telegram</strong> dengan kode verifikasi, lalu kirim foto makanan ke bot Gizku. Hasilnya otomatis tercatat di riwayatmu.</p>',
      },
      {
        id: 'faq_data', question: 'Apakah data makanan saya aman?', openDefault: false, status: 'draft',
        answerHtml: '<p>Foto dan catatan makananmu hanya dipakai untuk menampilkan riwayat dan ringkasan nutrisimu sendiri. Detailnya ada di <a href="/legal/kebijakan-privasi">Kebijakan Privasi</a>.</p>',
      },
      {
        id: 'faq_bahasa', question: 'Apakah Gizku tersedia dalam Bahasa Inggris?', openDefault: false, status: 'draft',
        answerHtml: '<p>Ya. Tampilan aplikasi dan hasil analisa tersedia dalam Bahasa Indonesia dan English — ganti kapan saja di <strong>Pengaturan → Bahasa</strong>.</p>',
      },
    ],
  },
  cta: {
    title: 'Mulai Perjalanan Sehatmu Hari Ini',
    subtitle: 'Bergabung sekarang dan mulai pahami apa yang kamu makan setiap hari — dengan tenang.',
    button: { label: 'Mulai Sekarang', target: { kind: 'auto' } },
    bg: 'green',
    showBadges: true,
    badgeLabel: 'Atau unduh aplikasinya',
    badges: ['appStore', 'googlePlay'],
  },
  footer: {
    tagline: 'AI Nutrition Companion · Analisa nutrisi dari foto makananmu',
    socials: [
      { id: 'soc_telegram', platform: 'telegram', url: '' },
    ],
    groups: [
      {
        id: 'grp_produk', name: 'Produk', kind: 'custom', links: [
          { id: 'lnk_fitur', label: 'Fitur', target: { kind: 'section', section: 'features' } },
          { id: 'lnk_cara', label: 'Cara Kerja', target: { kind: 'section', section: 'howItWorks' } },
          { id: 'lnk_faq', label: 'FAQ', target: { kind: 'section', section: 'faq' } },
        ],
      },
      {
        id: 'grp_bantuan', name: 'Bantuan', kind: 'custom', links: [
          { id: 'lnk_support', label: 'Hubungi Support', target: { kind: 'external', url: `mailto:${DEFAULT_SUPPORT_EMAIL}` } },
          { id: 'lnk_login', label: 'Masuk / Daftar', target: { kind: 'internal', path: '/login' } },
        ],
      },
      {
        id: 'grp_legal', name: 'Legal', kind: 'legal', links: [
          { id: 'lnk_tnc', label: 'Syarat & Ketentuan', target: { kind: 'internal', path: '/legal/syarat-ketentuan' } },
          { id: 'lnk_privacy', label: 'Kebijakan Privasi', target: { kind: 'internal', path: '/legal/kebijakan-privasi' } },
        ],
      },
    ],
    legalAutoSync: true,
    copyright: '© {tahun} Gizku. Dibuat untuk hidup lebih sehat.',
  },
}

/** Deep copy, so callers can mutate freely. */
export function cloneDefault(): LandingContent {
  return structuredClone(DEFAULT_CONTENT)
}
