/**
 * Client-side helper for the public /api/legal-content endpoint — shared by
 * the About page, the legal document detail page, and the login/register
 * consent line (components/LegalConsentLine.tsx).
 */

export type LegalLangContent = { title: string; bodyHtml: string }

export type LegalDocument = {
  slug: string
  typeKey: string
  typeLabel: string
  updatedAt: string
  langs: { id: LegalLangContent; en: LegalLangContent }
}

export type AboutLangContent = { description: string; disclaimer: string }

export type LegalContent = {
  documents: LegalDocument[]
  about: { id: AboutLangContent; en: AboutLangContent }
}

export async function fetchLegalContent(): Promise<LegalContent> {
  const res = await fetch('/api/legal-content')
  if (!res.ok) throw new Error('Failed to fetch legal content')
  return res.json()
}
