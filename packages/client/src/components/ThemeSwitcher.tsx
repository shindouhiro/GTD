import { Palette, Settings2 } from 'lucide-react'
import { useState } from 'react'
import { type Theme, useTheme } from '@/hooks/useTheme'
import { cn } from '@/lib/utils'

const themes: { id: Theme; name: string; color: string }[] = [
  { id: 'default', name: 'Default', color: 'bg-purple-600' },
  { id: 'ocean', name: 'Ocean', color: 'bg-blue-600' },
  { id: 'forest', name: 'Forest', color: 'bg-emerald-600' },
  { id: 'cyberpunk', name: 'Cyberpunk', color: 'bg-fuchsia-600' },
  { id: 'sunset', name: 'Sunset', color: 'bg-orange-600' },
  { id: 'dracula', name: 'Dracula', color: 'bg-violet-800' },
  { id: 'custom', name: 'Custom', color: 'bg-gradient-to-r from-red-500 via-green-500 to-blue-500' },
]

export function ThemeSwitcher({ className }: { className?: string }) {
  const { theme, setTheme, customColors, setCustomColors } = useTheme()
  const [isOpen, setIsOpen] = useState(false)

  const handleThemeChange = (themeId: Theme) => {
    setTheme(themeId)
    if (themeId !== 'custom') {
      setIsOpen(false)
    }
  }

  return (
    <div className={cn('relative', className)}>
      <button
        id="theme-switcher-toggle"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 bg-white/10 hover:bg-white/20 rounded-xl text-white font-medium transition-all"
        aria-label="Toggle theme"
        style={{ minWidth: '40px' }}
      >
        <Palette className="w-4 h-4" />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 bg-white/95 backdrop-blur-lg border border-white/20 rounded-2xl shadow-2xl z-50 overflow-hidden">
          <div className="p-2">
            {themes.map(tOption => (
              <button
                key={tOption.id}
                onClick={() => handleThemeChange(tOption.id)}
                className={cn(
                  'w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-gray-100/50 rounded-xl transition-colors',
                  theme === tOption.id && 'bg-black/5 text-theme-primary font-bold',
                )}
              >
                <span className={cn('w-5 h-5 rounded-lg shadow-sm shrink-0', tOption.color)} />
                <span className="font-medium text-gray-800 flex-1">{tOption.name}</span>
                {theme === tOption.id && (
                  <svg className="w-4 h-4 text-theme-primary" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                )}
              </button>
            ))}
          </div>

          {theme === 'custom' && (
            <div className="border-t border-gray-100 p-4 bg-gray-50/50">
              <div className="flex items-center gap-2 mb-3 text-gray-500">
                <Settings2 className="w-3.5 h-3.5" />
                <span className="text-xs font-bold uppercase tracking-wider">Custom Colors</span>
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-gray-600">Start</span>
                  <input
                    type="color"
                    value={customColors.start}
                    onChange={e => setCustomColors({ ...customColors, start: e.target.value })}
                    className="w-10 h-6 p-0 border-0 bg-transparent cursor-pointer"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-gray-600">Middle</span>
                  <input
                    type="color"
                    value={customColors.mid}
                    onChange={e => setCustomColors({ ...customColors, mid: e.target.value })}
                    className="w-10 h-6 p-0 border-0 bg-transparent cursor-pointer"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-gray-600">End</span>
                  <input
                    type="color"
                    value={customColors.end}
                    onChange={e => setCustomColors({ ...customColors, end: e.target.value })}
                    className="w-10 h-6 p-0 border-0 bg-transparent cursor-pointer"
                  />
                </div>
                <div className="flex items-center justify-between border-t border-gray-100 pt-2">
                  <span className="text-xs font-medium text-gray-600">Primary</span>
                  <input
                    type="color"
                    value={customColors.primary}
                    onChange={e => setCustomColors({ ...customColors, primary: e.target.value })}
                    className="w-10 h-6 p-0 border-0 bg-transparent cursor-pointer"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-gray-600">Accent</span>
                  <input
                    type="color"
                    value={customColors.accent}
                    onChange={e => setCustomColors({ ...customColors, accent: e.target.value })}
                    className="w-10 h-6 p-0 border-0 bg-transparent cursor-pointer"
                  />
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="w-full mt-4 py-2 bg-gradient-to-r from-theme-primary to-theme-accent hover:opacity-90 text-white text-xs font-bold rounded-lg transition-all shadow-lg"
              >
                Apply & Close
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
