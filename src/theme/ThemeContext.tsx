import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

const STORAGE_KEY = 'ia_theme'

export type AppTheme = 'light' | 'dark'

type ThemeContextValue = {
  theme: AppTheme
  setTheme: (t: AppTheme) => void
  toggleTheme: () => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

function readInitialTheme(): AppTheme {
  if (typeof window === 'undefined') {
    return 'light'
  }
  try {
    const s = window.localStorage.getItem(STORAGE_KEY) as AppTheme | null
    if (s === 'light' || s === 'dark') {
      return s
    }
  } catch {
    /* ignore */
  }
  return window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light'
}

function applyDocumentTheme(theme: AppTheme) {
  document.documentElement.setAttribute('data-theme', theme)
  document.documentElement.style.colorScheme = theme
  try {
    window.localStorage.setItem(STORAGE_KEY, theme)
  } catch {
    /* ignore */
  }
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<AppTheme>(readInitialTheme)

  useEffect(() => {
    applyDocumentTheme(theme)
  }, [theme])

  const setTheme = useCallback((t: AppTheme) => {
    setThemeState(t)
  }, [])

  const toggleTheme = useCallback(() => {
    setThemeState((t) => (t === 'light' ? 'dark' : 'light'))
  }, [])

  const value = useMemo<ThemeContextValue>(
    () => ({ theme, setTheme, toggleTheme }),
    [theme, setTheme, toggleTheme],
  )

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext)
  if (!ctx) {
    throw new Error('useTheme must be used within ThemeProvider')
  }
  return ctx
}
