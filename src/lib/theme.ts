import { useEffect, useState } from 'react'

/**
 * system: follow the OS setting.
 * sun:    light while the sun is up at the selected city, dark after sunset.
 */
export type ThemeSetting = 'system' | 'light' | 'dark' | 'sun'

export const THEME_OPTIONS: { id: ThemeSetting; label: string; hint: string }[] = [
  { id: 'system', label: 'System', hint: 'Match your device' },
  { id: 'light', label: 'Light', hint: 'Always light' },
  { id: 'dark', label: 'Dark', hint: 'Always dark' },
  { id: 'sun', label: 'Day and night', hint: 'Dark after sunset in the selected city' },
]

const query = () => window.matchMedia('(prefers-color-scheme: dark)')

function useSystemDark() {
  const [dark, setDark] = useState(() => query().matches)
  useEffect(() => {
    const mq = query()
    const on = () => setDark(mq.matches)
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [])
  return dark
}

/** Resolves the setting, applies it to <html data-theme>, and returns whether it's dark. */
export function useTheme(setting: ThemeSetting, isDayAtPlace: boolean | null) {
  const systemDark = useSystemDark()
  const dark =
    setting === 'dark' ||
    (setting === 'system' && systemDark) ||
    (setting === 'sun' && (isDayAtPlace === null ? systemDark : !isDayAtPlace))

  useEffect(() => {
    const root = document.documentElement
    root.dataset.theme = dark ? 'dark' : 'light'
    root.style.colorScheme = dark ? 'dark' : 'light'
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#141922' : '#ffffff')
  }, [dark])

  return dark
}
