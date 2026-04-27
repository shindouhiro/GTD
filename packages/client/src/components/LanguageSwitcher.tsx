import { ChevronDown, Globe } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'

const languages = [
  { code: 'en', name: 'English', flag: '🇺🇸' },
  { code: 'zh', name: '中文', flag: '🇨🇳' },
]

export function LanguageSwitcher({ className }: { className?: string }) {
  const { i18n, t } = useTranslation()
  const [isOpen, setIsOpen] = useState(false)
  const normalizedLanguage = i18n.resolvedLanguage?.split('-')[0] || 'en'

  const handleLanguageChange = (languageCode: string) => {
    i18n.changeLanguage(languageCode)
    setIsOpen(false)
  }

  const currentLanguage = languages.find(lang => lang.code === normalizedLanguage) || languages[0]

  return (
    <div className={cn('relative', className)}>
      <button
        id="language-switcher-toggle"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 bg-white/10 hover:bg-white/20 rounded-xl text-white font-medium transition-all"
        aria-label={t('languageSwitcher.toggle')}
        style={{ minWidth: '80px' }}
      >
        <Globe className="w-4 h-4" />
        <span className="text-sm">{currentLanguage.flag}</span>
        <ChevronDown className={cn('w-3 h-3 transition-transform', isOpen && 'rotate-180')} />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 bg-white/95 backdrop-blur-lg border border-white/20 rounded-xl shadow-xl z-50">
          {languages.map(language => (
            <button
              id={`language-option-${language.code}`}
              key={language.code}
              onClick={() => handleLanguageChange(language.code)}
              className={cn(
                'w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-100 transition-colors first:rounded-t-xl last:rounded-b-xl',
                normalizedLanguage === language.code && 'bg-black/5 text-theme-primary font-bold',
              )}
            >
              <span className="text-lg">{language.flag}</span>
              <span className="font-medium">{language.name}</span>
              {normalizedLanguage === language.code && (
                <svg className="w-4 h-4 ml-auto text-theme-primary" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
