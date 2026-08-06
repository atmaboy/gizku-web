import type { Language } from './LanguageContext'

export function pickLocalizedText(id: string | undefined, en: string | undefined, language: Language): string | undefined {
  return language === 'en' && en ? en : id
}
