import { createContext, useContext, useState, useEffect, ReactNode } from 'react'

type Theme = 'dark' | 'light' | 'system'

interface ThemeContextType {
  theme: 'dark' | 'light'
  rawTheme: Theme
  toggle: () => void
  setThemeMode: (t: Theme) => void
  accent: string
  setAccent: (color: string) => void
}

const ThemeContext = createContext<ThemeContextType>({
  theme: 'dark',
  rawTheme: 'dark',
  toggle: () => {},
  setThemeMode: () => {},
  accent: '#0078d4',
  setAccent: () => {},
})

function hexToHsl(hex: string): [number, number, number] {
  const r = parseInt(hex.slice(1, 3), 16) / 255
  const g = parseInt(hex.slice(3, 5), 16) / 255
  const b = parseInt(hex.slice(5, 7), 16) / 255
  const max = Math.max(r, g, b), min = Math.min(r, g, b)
  let h = 0, s = 0, l = (max + min) / 2
  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6
    else if (max === g) h = ((b - r) / d + 2) / 6
    else h = ((r - g) / d + 4) / 6
  }
  return [Math.round(h * 360), Math.round(s * 100), Math.round(l * 100)]
}

function hslToHex(h: number, s: number, l: number): string {
  s /= 100; l /= 100
  const a = s * Math.min(l, 1 - l)
  const f = (n: number) => {
    const k = (n + h / 30) % 12
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1)
    return Math.round(255 * color).toString(16).padStart(2, '0')
  }
  return `#${f(0)}${f(8)}${f(4)}`
}

function generateAccentVars(hex: string) {
  const [h, s, l] = hexToHsl(hex)
  return {
    '--accent': hex,
    '--accent-hover': hslToHex(h, Math.min(100, s + 10), Math.max(0, l - 10)),
    '--accent-bg': `hsla(${h}, ${s}%, ${l}%, 0.12)`,
  }
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [rawTheme, setRawTheme] = useState<Theme>(() => {
    return (localStorage.getItem('plume-theme') as Theme) || 'system'
  })

  const [accent, setAccentState] = useState(() => {
    return localStorage.getItem('plume-accent') || '#0078d4'
  })

  const [systemTheme, setSystemTheme] = useState<'dark' | 'light'>(() => {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  })

  const resolvedTheme = rawTheme === 'system' ? systemTheme : rawTheme

  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = (e: MediaQueryListEvent) => setSystemTheme(e.matches ? 'dark' : 'light')
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', resolvedTheme)
    localStorage.setItem('plume-theme', rawTheme)
  }, [resolvedTheme, rawTheme])

  useEffect(() => {
    localStorage.setItem('plume-accent', accent)
    const vars = generateAccentVars(accent)
    Object.entries(vars).forEach(([key, val]) => {
      document.documentElement.style.setProperty(key, val)
    })
  }, [accent])

  const toggle = () => setRawTheme(t => t === 'dark' ? 'light' : t === 'light' ? 'system' : 'dark')
  const setThemeMode = (t: Theme) => setRawTheme(t)
  const setAccent = (color: string) => setAccentState(color)

  return (
    <ThemeContext.Provider value={{ theme: resolvedTheme, rawTheme, toggle, setThemeMode, accent, setAccent }}>
      {children}
    </ThemeContext.Provider>
  )
}

export const useTheme = () => useContext(ThemeContext)
