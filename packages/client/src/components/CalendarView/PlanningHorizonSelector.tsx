import { type Locale, format } from 'date-fns'
import { useTranslation } from 'react-i18next'

export type PlanningHorizon = 'selectedDate' | 'week' | 'month' | 'year'

interface PlanningHorizonSelectorProps {
  horizon: PlanningHorizon
  onChange: (horizon: PlanningHorizon) => void
  targetDate: Date
  isChinese: boolean
  dateLocale: Locale
  idPrefix: string
}

export function PlanningHorizonSelector({
  horizon,
  onChange,
  targetDate,
  isChinese,
  dateLocale,
  idPrefix,
}: PlanningHorizonSelectorProps) {
  const { t } = useTranslation()
  const options: Array<{ value: PlanningHorizon, label: string }> = [
    { value: 'selectedDate', label: t('calendar.planningHorizon.selectedDate') },
    { value: 'week', label: t('calendar.planningHorizon.week') },
    { value: 'month', label: t('calendar.planningHorizon.month') },
    { value: 'year', label: t('calendar.planningHorizon.year') },
  ]

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-white/60">
        {t('calendar.planningHorizon.label')}
      </p>
      <div className="grid grid-cols-2 gap-2">
        {options.map(option => (
          <button
            id={`${idPrefix}-planning-horizon-${option.value}`}
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={`rounded-lg px-3 py-2 text-xs font-medium transition-all ${
              horizon === option.value
                ? 'bg-gradient-to-br from-theme-primary to-theme-accent text-white shadow-lg'
                : 'bg-white/5 text-white/70 hover:bg-white/10'
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>
      <p className="text-xs text-white/50">
        {t('calendar.planningHorizon.targetDate', {
          date: format(targetDate, isChinese ? 'yyyy年M月d日' : 'MMM d, yyyy', { locale: dateLocale }),
        })}
      </p>
    </div>
  )
}
