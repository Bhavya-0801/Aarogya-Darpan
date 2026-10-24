'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'
import { Language, translate } from '@/lib/translations'

interface LanguageContextType {
  language: Language
  setLanguage: (lang: Language) => void
  t: (key: string) => string
}

const LanguageContext = createContext<LanguageContextType>({
  language: 'en',
  setLanguage: () => {},
  t: (key: string) => key,
})

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>('en')

  useEffect(() => {
    try {
      const saved = localStorage.getItem('aarogya_lang') as Language
      if (saved === 'hi' || saved === 'en') {
        setLanguageState(saved)
      }
    } catch {}

    function handleStorage(e: StorageEvent) {
      if (e.key === 'aarogya_lang' && (e.newValue === 'en' || e.newValue === 'hi')) {
        setLanguageState(e.newValue as Language)
      }
    }

    function handleCustomChange(e: any) {
      if (e.detail === 'en' || e.detail === 'hi') {
        setLanguageState(e.detail)
      }
    }

    window.addEventListener('storage', handleStorage)
    window.addEventListener('languageChange', handleCustomChange)
    return () => {
      window.removeEventListener('storage', handleStorage)
      window.removeEventListener('languageChange', handleCustomChange)
    }
  }, [])

  function setLanguage(lang: Language) {
    setLanguageState(lang)
    try {
      localStorage.setItem('aarogya_lang', lang)
      window.dispatchEvent(new CustomEvent('languageChange', { detail: lang }))
    } catch {}
  }

  function t(key: string) {
    return translate(key, language)
  }

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  return useContext(LanguageContext)
}
