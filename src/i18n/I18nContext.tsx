import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { messageBundles, type AppLocale, type MessageKey } from './bundles'

const STORAGE_KEY = 'ia_locale'

function readInitialLocale(): AppLocale {
  if (typeof window !== 'undefined') {
    try {
      const s = window.localStorage.getItem(STORAGE_KEY) as AppLocale | null
      if (s === 'en' || s === 'fr') {
        return s
      }
    } catch {
      /* ignore */
    }
  }
  const raw = import.meta.env.VITE_DEFAULT_LOCALE?.trim()
  if (raw === 'en' || raw === 'fr') {
    return raw
  }
  return 'fr'
}

export type I18nContextValue = {
  locale: AppLocale
  setLocale: (locale: AppLocale) => void
  t: (id: MessageKey) => string
  tBatch: <K extends MessageKey>(keys: readonly K[]) => string[]
}

const I18nContext = createContext<I18nContextValue | null>(null)

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<AppLocale>(readInitialLocale)

  const setLocale = useCallback((next: AppLocale) => {
    setLocaleState(next)
    try {
      window.localStorage.setItem(STORAGE_KEY, next)
    } catch {
      /* ignore */
    }
  }, [])

  const t = useCallback(
    (id: MessageKey) => messageBundles[locale][id],
    [locale],
  )

  const tBatch = useCallback(
    <K extends MessageKey>(keys: readonly K[]) => keys.map((k) => messageBundles[locale][k]),
    [locale],
  )

  const value = useMemo<I18nContextValue>(
    () => ({ locale, setLocale, t, tBatch }),
    [locale, setLocale, t, tBatch],
  )

  useEffect(() => {
    document.documentElement.lang = locale === 'en' ? 'en' : 'fr'
  }, [locale])

  return (
    <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components -- hook partagé
export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext)
  if (!ctx) {
    throw new Error('useI18n doit être utilisé dans I18nProvider')
  }
  return ctx
}
