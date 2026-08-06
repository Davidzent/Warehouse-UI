export type Theme = 'light' | 'dark'

// A display preference, not a credential — unlike the token it should outlive
// the tab, so localStorage is right here.
const STORAGE_KEY = 'warehouse.theme'

/** Falls back to the terminal's own setting until the clerk picks one. */
export function readTheme(): Theme {
  const stored = localStorage.getItem(STORAGE_KEY)
  if (stored === 'light' || stored === 'dark') return stored
  return matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

export function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme
}

export function storeTheme(theme: Theme) {
  localStorage.setItem(STORAGE_KEY, theme)
}
