'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { translations, type Dict } from './translations'

export type Language = 'id' | 'en'

const DEFAULT_LANGUAGE: Language = 'id'
const STORAGE_KEY = 'gizku_language'

function resolve(dict: Dict, key: string): string | undefined {
  let node: Dict | string = dict
  for (const part of key.split('.')) {
    if (typeof node !== 'object' || node === null) return undefined
    node = node[part] as Dict | string
    if (node === undefined) return undefined
  }
  return typeof node === 'string' ? node : undefined
}

function interpolate(template: string, params?: Record<string, string | number>) {
  if (!params) return template
  return template.replace(/\{\{(\w+)\}\}/g, (match, token) => (token in params ? String(params[token]) : match))
}

type LanguageContextValue = {
  language: Language
  setLanguage: (lang: Language) => void
  t: (key: string, params?: Record<string, string | number>) => string
}

const LanguageContext = createContext<LanguageContextValue | null>(null)

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  // Default 'id' on the server and on first client paint (matches SSR output, no
  // hydration mismatch), then swap right after mount if localStorage says otherwise —
  // same pattern the mobile app uses with SecureStore.
  const [language, setLanguageState] = useState<Language>(DEFAULT_LANGUAGE)

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved === 'id' || saved === 'en') setLanguageState(saved)
    } catch {
      // fail-open — tetap pakai default Bahasa Indonesia
    }
  }, [])

  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang)
    try {
      localStorage.setItem(STORAGE_KEY, lang)
    } catch {}
  }, [])

  const t = useCallback(
    (key: string, params?: Record<string, string | number>) => {
      const value = resolve(translations[language], key) ?? resolve(translations[DEFAULT_LANGUAGE], key) ?? key
      return interpolate(value, params)
    },
    [language]
  )

  const value = useMemo<LanguageContextValue>(() => ({ language, setLanguage, t }), [language, setLanguage, t])

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
}

export function useTranslation() {
  const ctx = useContext(LanguageContext)
  if (!ctx) throw new Error('useTranslation must be used within LanguageProvider')
  return ctx
}
