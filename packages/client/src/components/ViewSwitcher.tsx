import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'

interface ViewOption<T extends string> {
  value: T
  label: string
  icon: ReactNode
}

interface ViewSwitcherProps<T extends string> {
  options: ViewOption<T>[]
  value: T
  onChange: (value: T) => void
}

export function ViewSwitcher<T extends string>({ options, value, onChange }: ViewSwitcherProps<T>) {
  return (
    <div className="flex bg-black/40 backdrop-blur-xl p-1.5 rounded-2xl w-full xl:w-auto border border-white/10 shadow-[0_0_20px_rgba(0,0,0,0.2)]">
      {options.map(option => (
        <button
          key={option.value}
          onClick={() => onChange(option.value)}
          className={cn(
            'flex-1 xl:flex-none relative px-7 py-2.5 rounded-xl transition-all duration-300 tracking-wide text-sm font-bold flex items-center justify-center gap-2 overflow-hidden group',
            value === option.value
              ? 'text-white'
              : 'text-white/60 hover:text-white',
          )}
        >
          {value === option.value ? (
            <div className="absolute inset-0 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-xl shadow-[0_4px_15px_rgba(99,102,241,0.3)]" />
          ) : (
            <div className="absolute inset-0 bg-white/0 group-hover:bg-white/10 transition-colors duration-300 rounded-xl" />
          )}
          <div className="relative z-10 flex items-center gap-2">
            {option.icon}
            {option.label}
          </div>
        </button>
      ))}
    </div>
  )
}

export type ViewMode = 'calendar' | 'table'

export function useViewOptions(): ViewOption<ViewMode>[] {
  const { t } = useTranslation()

  return [
    {
      value: 'calendar',
      label: t('taskView.calendar'),
      icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>,
    },
    {
      value: 'table',
      label: t('taskView.table'),
      icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" /></svg>,
    },
  ]
}
