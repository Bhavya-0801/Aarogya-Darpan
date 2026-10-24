'use client'
import React from 'react'
import { Globe, Check } from 'lucide-react'
import toast from 'react-hot-toast'
import { useLanguage } from '@/components/providers/LanguageProvider'

export default function LanguagePreferenceCard() {
  const { language, setLanguage, t } = useLanguage()

  return (
    <div className="card-new p-6 mb-4">
      <div className="flex items-center gap-2 mb-3">
        <Globe className="w-5 h-5 text-teal-600 dark:text-teal-400" />
        <h3 className="font-bold text-base" style={{ color: 'var(--text)' }}>
          {language === 'hi' ? 'भाषा प्राथमिकता (Language Preference)' : 'Language Preference (भाषा प्राथमिकता)'}
        </h3>
      </div>
      <p className="text-xs mb-4" style={{ color: 'var(--text-muted)' }}>
        {language === 'hi'
          ? 'अपनी पसंदीदा भाषा चुनें। संपूर्ण पोर्टल और एआई सहायक इस भाषा का उपयोग करेंगे।'
          : 'Choose your preferred language. The entire portal and AI Assistant will adapt to this language.'}
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => {
            setLanguage('en')
            toast.success('Language changed to English')
          }}
          className={`flex items-center justify-between p-4 rounded-xl border text-left transition-all ${
            language === 'en'
              ? 'border-teal-500 bg-teal-500/10 shadow-sm'
              : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50'
          }`}
        >
          <div className="flex items-center gap-3">
            <span className="text-2xl">🇬🇧</span>
            <div>
              <p className="font-semibold text-sm" style={{ color: 'var(--text)' }}>English</p>
              <p className="text-xs text-slate-500">Default interface language</p>
            </div>
          </div>
          {language === 'en' && <Check className="w-5 h-5 text-teal-600 dark:text-teal-400" />}
        </button>

        <button
          type="button"
          onClick={() => {
            setLanguage('hi')
            toast.success('भाषा बदलकर हिंदी कर दी गई है')
          }}
          className={`flex items-center justify-between p-4 rounded-xl border text-left transition-all ${
            language === 'hi'
              ? 'border-teal-500 bg-teal-500/10 shadow-sm'
              : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50'
          }`}
        >
          <div className="flex items-center gap-3">
            <span className="text-2xl">🇮🇳</span>
            <div>
              <p className="font-semibold text-sm" style={{ color: 'var(--text)' }}>हिंदी (Hindi)</p>
              <p className="text-xs text-slate-500">संपूर्ण इंटरफ़ेस और एआई हिंदी में</p>
            </div>
          </div>
          {language === 'hi' && <Check className="w-5 h-5 text-teal-600 dark:text-teal-400" />}
        </button>
      </div>
    </div>
  )
}
