import { useState } from 'react'
import { applyTheme, readTheme, storeTheme } from '../theme'
import type { Theme } from '../theme'

/** Shows the mode it will switch to, not the one already in use. */
export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>(readTheme)

  function toggle() {
    const next: Theme = theme === 'dark' ? 'light' : 'dark'
    applyTheme(next)
    storeTheme(next)
    setTheme(next)
  }

  const goingDark = theme === 'light'

  return (
    <button
      type="button"
      className="theme-toggle"
      onClick={toggle}
      aria-label={goingDark ? 'Switch to dark mode' : 'Switch to light mode'}
    >
      {goingDark ? <MoonIcon /> : <SunIcon />}
    </button>
  )
}

function SunIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="20"
      height="20"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="4.2" />
      <path d="M12 2.5v2M12 19.5v2M4.4 4.4l1.4 1.4M18.2 18.2l1.4 1.4M2.5 12h2M19.5 12h2M4.4 19.6l1.4-1.4M18.2 5.8l1.4-1.4" />
    </svg>
  )
}

function MoonIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="20"
      height="20"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M20.5 13.2A8.5 8.5 0 1 1 10.8 3.5a6.6 6.6 0 0 0 9.7 9.7Z" />
    </svg>
  )
}
