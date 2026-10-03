import { useEffect, useState } from 'react'

export type Language = 'VN' | 'EN'

const STORAGE_KEY = 'hubblock-language'

function getInitialLanguage(): Language {
  if (typeof window === 'undefined') return 'VN'
  return localStorage.getItem(STORAGE_KEY) === 'EN' ? 'EN' : 'VN'
}

export function useLanguage(): Language {
  const [language, setLanguage] = useState<Language>(getInitialLanguage)

  useEffect(() => {
    const update = (event: Event) => {
      const detail = (event as CustomEvent<Language>).detail
      if (detail === 'VN' || detail === 'EN') {
        setLanguage(detail)
      }
    }
    window.addEventListener('hubblock-language-change', update)
    return () => window.removeEventListener('hubblock-language-change', update)
  }, [])

  return language
}

export function useTranslation<T extends Record<string, string>>(translations: { VN: T; EN: T }): (key: keyof T) => string {
  const language = useLanguage()
  return (key) => translations[language][key]
}
