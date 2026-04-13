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
    <div className="flex bg-black/40 p-1 rounded-xl w-full xl:w-auto shadow-inner border border-white/5">
      {options.map(option => (
        <button
          key={option.value}
          onClick={() => onChange(option.value)}
          className={cn(
            'flex-1 xl:flex-none px-6 py-2.5 rounded-lg transition-all duration-300 tracking-wide text-sm font-bold flex items-center justify-center gap-2',
            value === option.value
              ? 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-[0_0_20px_rgba(99,102,241,0.4)]'
              : 'text-white/50 hover:text-white hover:bg-white/10',
          )}
        >
          {option.icon}
          {option.label}
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
