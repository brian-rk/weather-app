import { TRANSLATIONS } from './translations'

export type Lang = 'en' | 'es' | 'fr' | 'de' | 'pt' | 'sw'

export const LANGUAGES: { id: Lang; label: string; locale: string }[] = [
  { id: 'en', label: 'English', locale: 'en-GB' },
  { id: 'es', label: 'Español', locale: 'es-ES' },
  { id: 'fr', label: 'Français', locale: 'fr-FR' },
  { id: 'de', label: 'Deutsch', locale: 'de-DE' },
  { id: 'pt', label: 'Português', locale: 'pt-BR' },
  { id: 'sw', label: 'Kiswahili', locale: 'sw-KE' },
]

let current: Lang = 'en'

/**
 * Sets the active language. App re-keys its tree on change, so every
 * component re-renders with the new strings and date formats.
 */
export function setLang(lang: Lang) {
  current = lang
  if (typeof document !== 'undefined') document.documentElement.lang = lang
}

export const getLang = () => current
export const locale = () => LANGUAGES.find((l) => l.id === current)?.locale ?? 'en-GB'

/** Best guess from the browser, used until the user picks a language. */
export function detectLang(): Lang {
  const nav = (typeof navigator !== 'undefined' ? navigator.language : 'en').slice(0, 2)
  return (LANGUAGES.find((l) => l.id === nav)?.id ?? 'en') as Lang
}

/**
 * Translate an English UI string. The English text is the key, so untranslated
 * strings fall back to readable English. `{name}` placeholders are filled from `vars`.
 */
export function t(text: string, vars?: Record<string, string | number>) {
  const out = current === 'en' ? text : (TRANSLATIONS[current]?.[text] ?? text)
  return vars ? out.replace(/\{(\w+)\}/g, (_, k: string) => String(vars[k] ?? '')) : out
}

/** Locale-aware day formats from an ISO date (yyyy-mm-dd). */
export function formatDay(iso: string, style: 'short' | 'long' | 'date' | 'month') {
  const [y, m, d] = iso.split('-').map(Number)
  const date = new Date(Date.UTC(y, m - 1, d))
  const opts: Intl.DateTimeFormatOptions =
    style === 'short'
      ? { weekday: 'short' }
      : style === 'long'
        ? { weekday: 'long' }
        : style === 'month'
          ? { month: 'long' }
          : { weekday: 'short', day: 'numeric', month: 'short' }
  const out = date.toLocaleDateString(locale(), { ...opts, timeZone: 'UTC' })
  return out.charAt(0).toUpperCase() + out.slice(1)
}
