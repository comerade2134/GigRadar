import { TRANSLATIONS } from './translations'
import type { SupportedLocale, TranslationKey } from './types'

export * from './types'
export * from './flags'
export { TRANSLATIONS } from './translations'

const DEFAULT_LOCALE: SupportedLocale = 'en'
let cachedLocale: SupportedLocale = DEFAULT_LOCALE

export async function getLanguage(): Promise<SupportedLocale> {
  if (typeof chrome === 'undefined' || !chrome.storage?.local) {
    return cachedLocale
  }
  try {
    const data = await chrome.storage.local.get(['gigradar_language'])
    const stored = data.gigradar_language as SupportedLocale | undefined
    if (stored && stored in TRANSLATIONS) {
      cachedLocale = stored
      return stored
    }
  } catch {
    // fallback to cache
  }
  return DEFAULT_LOCALE
}

export async function setLanguage(locale: SupportedLocale): Promise<void> {
  cachedLocale = locale
  if (typeof chrome !== 'undefined' && chrome.storage?.local) {
    await chrome.storage.local.set({
      gigradar_language: locale,
      gigradar_language_selected: true
    })
  }
}

export async function hasSelectedLanguage(): Promise<boolean> {
  if (typeof chrome === 'undefined' || !chrome.storage?.local) {
    return true
  }
  try {
    const data = await chrome.storage.local.get(['gigradar_language_selected'])
    return Boolean(data.gigradar_language_selected)
  } catch {
    return true
  }
}

export function t(key: TranslationKey, locale?: SupportedLocale): string {
  const active = locale || cachedLocale
  const dict = TRANSLATIONS[active] || TRANSLATIONS[DEFAULT_LOCALE]
  return dict[key] || TRANSLATIONS[DEFAULT_LOCALE][key] || key
}

export function subscribeLanguageChange(
  callback: (locale: SupportedLocale) => void
): () => void {
  if (typeof chrome === 'undefined' || !chrome.storage?.onChanged) {
    return () => {}
  }

  const listener = (
    changes: Record<string, chrome.storage.StorageChange>,
    area: string
  ): void => {
    if (area === 'local' && changes.gigradar_language?.newValue) {
      const newLang = changes.gigradar_language.newValue as SupportedLocale
      if (newLang in TRANSLATIONS) {
        cachedLocale = newLang
        callback(newLang)
      }
    }
  }

  chrome.storage.onChanged.addListener(listener)
  return () => chrome.storage.onChanged.removeListener(listener)
}
