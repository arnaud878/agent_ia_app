import { messageBundles as bundles, type AppLocale, type MessageKey } from './bundles'

const STORAGE = 'ia_locale'
const SUPPORTED: AppLocale[] = ['fr', 'en']

function readEnvLocale(): AppLocale {
  const raw = (import.meta.env.VITE_DEFAULT_LOCALE as string | undefined)?.trim()
  if (raw === 'en' || raw === 'fr') {
    return raw
  }
  return 'fr'
}

function readStorageLocale(): AppLocale {
  if (typeof window === 'undefined') {
    return readEnvLocale()
  }
  const v = window.localStorage.getItem(STORAGE) as AppLocale | null
  if (v === 'en' || v === 'fr') {
    return v
  }
  return readEnvLocale()
}

let currentLocale: AppLocale = readStorageLocale()

export function getLocale(): AppLocale {
  return currentLocale
}

export function setLocale(locale: AppLocale): void {
  if (!SUPPORTED.includes(locale)) {
    return
  }
  currentLocale = locale
  try {
    window.localStorage.setItem(STORAGE, locale)
  } catch {
    /* ignore */
  }
}

/**
 * Résout une clé de message (FR/EN) — seule voie d’accès aux libellés UI côté app.
 */
export function t(id: MessageKey, locale: AppLocale = currentLocale): string {
  return bundles[locale][id]
}

export function tBatch<K extends MessageKey>(keys: readonly K[]): string[] {
  return keys.map((k) => t(k))
}
