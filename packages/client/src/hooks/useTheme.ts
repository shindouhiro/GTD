import { useEffect, useState } from 'react'

export type Theme = 'default' | 'ocean' | 'forest' | 'cyberpunk' | 'sunset' | 'dracula' | 'custom'

export interface CustomColors {
  start: string
  mid: string
  end: string
  primary: string
  accent: string
}

const DEFAULT_CUSTOM: CustomColors = {
  start: '#1e1b4b',
  mid: '#312e81',
  end: '#1e1b4b',
  primary: '#4f46e5',
  accent: '#6366f1',
}

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>(() => {
    const savedTheme = localStorage.getItem('app-theme') as Theme
    return savedTheme || 'default'
  })

  const [customColors, setCustomColorsState] = useState<CustomColors>(() => {
    const saved = localStorage.getItem('app-theme-custom')
    return saved ? JSON.parse(saved) : DEFAULT_CUSTOM
  })

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('app-theme', theme)

    if (theme === 'custom') {
      document.documentElement.style.setProperty('--theme-start', customColors.start)
      document.documentElement.style.setProperty('--theme-mid', customColors.mid)
      document.documentElement.style.setProperty('--theme-end', customColors.end)
      document.documentElement.style.setProperty('--theme-primary', customColors.primary)
      document.documentElement.style.setProperty('--theme-accent', customColors.accent)
    } else {
      document.documentElement.style.removeProperty('--theme-start')
      document.documentElement.style.removeProperty('--theme-mid')
      document.documentElement.style.removeProperty('--theme-end')
      document.documentElement.style.removeProperty('--theme-primary')
      document.documentElement.style.removeProperty('--theme-accent')
    }
  }, [theme, customColors])

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme)
  }

  const setCustomColors = (colors: CustomColors) => {
    setCustomColorsState(colors)
    localStorage.setItem('app-theme-custom', JSON.stringify(colors))
  }

  return {
    theme,
    setTheme,
    customColors,
    setCustomColors,
  }
}
