import { useEffect, useState } from 'react'

export type Theme = 'default' | 'ocean' | 'forest' | 'cyberpunk' | 'sunset' | 'dracula' | 'custom'

export interface CustomColors {
  start: string
  mid: string
  end: string
}

const DEFAULT_CUSTOM: CustomColors = {
  start: '#1e1b4b',
  mid: '#312e81',
  end: '#1e1b4b',
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
    } else {
      document.documentElement.style.removeProperty('--theme-start')
      document.documentElement.style.removeProperty('--theme-mid')
      document.documentElement.style.removeProperty('--theme-end')
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
