-- Migration: Seed default footer content for landing page
-- Run this in Supabase SQL Editor or via supabase db push

INSERT INTO landing_content (section, slug, title, subtitle, body, meta, is_active, sort_order)
VALUES (
  'footer',
  'footer-main',
  'Gizku',
  'Kenali nutrisimu, hidup lebih sehat.',
  '© 2025 Gizku. Hak cipta dilindungi.',
  '{
    "links": [
      { "label": "Fitur",             "href": "/#features", "group": "Produk" },
      { "label": "Cara Kerja",        "href": "/#how",      "group": "Produk" },
      { "label": "Download App",      "href": "/#download", "group": "Produk" },
      { "label": "Tentang Kami",      "href": "/about",     "group": "Perusahaan" },
      { "label": "Blog",              "href": "/blog",      "group": "Perusahaan" },
      { "label": "Kebijakan Privasi", "href": "/privacy",   "group": "Legal" },
      { "label": "Syarat Penggunaan", "href": "/terms",     "group": "Legal" }
    ],
    "social": [
      { "icon": "instagram", "href": "https://instagram.com/gizku.id", "label": "Instagram Gizku" },
      { "icon": "tiktok",    "href": "https://tiktok.com/@gizku.id",   "label": "TikTok Gizku" }
    ],
    "app_links": []
  }'::jsonb,
  true,
  999
)
ON CONFLICT (slug) DO NOTHING;
