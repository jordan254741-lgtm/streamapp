import { createContext, useCallback, useEffect, useState } from 'react'

type Theme = 'light' | 'dark' | 'system'

interface ThemeContextValue {
  theme: Theme
  effective: 'light' | 'dark'
  setTheme: (t: Theme) => void
  toggle: () => void
}

// eslint-disable-next-line react-refresh/only-export-components
export const ThemeContext = createContext<ThemeContextValue | null>(null)

function getSystemTheme(): 'light' | 'dark' {
  if (typeof window === 'undefined') return 'light'
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function getStoredTheme(): Theme {
  try {
    const stored = localStorage.getItem('streamapp-theme')
    if (stored === 'light' || stored === 'dark' || stored === 'system') return stored
  } catch { /* ignore */ }
  return 'system'
}

function applyTheme(theme: Theme) {
  const effective = theme === 'system' ? getSystemTheme() : theme
  document.documentElement.classList.toggle('dark', effective === 'dark')
  return effective
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(getStoredTheme)
  const [effective, setEffective] = useState<'light' | 'dark'>(() => applyTheme(getStoredTheme()))

  const setTheme = useCallback((t: Theme) => {
    setThemeState(t)
    try { localStorage.setItem('streamapp-theme', t) } catch { /* ignore */ }
    setEffective(applyTheme(t))
  }, [])

  const toggle = useCallback(() => {
    const order: Theme[] = ['light', 'dark', 'system']
    const next = order[(order.indexOf(theme) + 1) % order.length]
    setTheme(next)
  }, [theme, setTheme])

  useEffect(() => {
    if (theme !== 'system') return
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = () => setEffective(applyTheme('system'))
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [theme])

  return (
    <ThemeContext.Provider value={{ theme, effective, setTheme, toggle }}>
      {children}
    </ThemeContext.Provider>
  )
}


