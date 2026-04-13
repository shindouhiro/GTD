import { format, isSameDay, isSameMonth, isToday } from 'date-fns'
import { HolidayUtil, Solar } from 'lunar-javascript'
import { cn } from '@/lib/utils'
import type { Todo } from '@/db'

interface CalendarDayCellProps {
  day: Date
  monthStart: Date
  selectedDate: Date | null
  dayTodos: Todo[]
  isChinese: boolean
  onDateClick: (day: Date) => void
}

export function CalendarDayCell({
  day,
  monthStart,
  selectedDate,
  dayTodos,
  isChinese,
  onDateClick,
}: CalendarDayCellProps) {
  const isSelected = selectedDate && isSameDay(day, selectedDate)

  return (
    <div
      onClick={() => onDateClick(day)}
      className={cn(
        'aspect-square relative flex flex-col items-center justify-center rounded-full md:rounded-2xl cursor-pointer transition-all duration-300 group',
        !isSameMonth(day, monthStart) && 'opacity-30',
        isSelected
          ? 'bg-gradient-to-br from-indigo-500 to-purple-600 shadow-lg scale-105 z-10'
          : 'hover:bg-white/5 bg-white/5 border border-white/5',
        isToday(day) && !isSelected && 'border-indigo-400 border-2',
      )}
    >
      {/* Holiday Badge */}
      {isChinese && (() => {
        const holiday = HolidayUtil.getHoliday(day.getFullYear(), day.getMonth() + 1, day.getDate())
        if (!holiday)
          return null
        const isWork = holiday.isWork()
        return (
          <div className={cn(
            'absolute top-1 right-1 md:top-2 md:right-2 w-4 h-4 md:w-5 md:h-5 flex items-center justify-center rounded-md text-[8px] md:text-[10px] font-bold shadow-sm',
            isWork
              ? 'bg-amber-500/80 text-white'
              : 'bg-rose-500/80 text-white',
          )}
          >
            {isWork ? '班' : '休'}
          </div>
        )
      })()}

      <span
        className={cn(
          'text-sm md:text-lg font-semibold',
          isSelected ? 'text-white' : 'text-white/90',
        )}
      >
        {format(day, 'd')}
      </span>
      
      {isChinese && (
        <span
          className={cn(
            'text-[10px] md:text-xs mt-0.5 leading-none font-medium transition-all group-hover:opacity-100',
            isSelected ? 'text-white/80' : 'text-white/40 group-hover:text-white/60',
          )}
        >
          {(() => {
            const solar = Solar.fromDate(day)
            const lunar = solar.getLunar()
            const festivals = lunar.getFestivals()
            const solarTerms = lunar.getJieQi()
            const holiday = HolidayUtil.getHoliday(solar.getYear(), solar.getMonth(), solar.getDay())

            // Prioritize holiday name if it exists and is not a workday
            if (holiday && !holiday.isWork())
              return holiday.getName().length > 3 ? holiday.getName().substring(0, 3) : holiday.getName()

            if (festivals.length > 0)
              return festivals[0]
            if (solarTerms)
              return solarTerms
            return lunar.getDayInChinese() === '初一' ? `${lunar.getMonthInChinese()}月` : lunar.getDayInChinese()
          })()}
        </span>
      )}

      {/* Todo Indicators */}
      <div className="flex gap-0.5 md:gap-1 mt-1 md:mt-2">
        {dayTodos.slice(0, 3).map((_, i) => (
          <div
            key={i}
            className={cn(
              'w-1 h-1 md:w-1.5 md:h-1.5 rounded-full',
              isSelected ? 'bg-white/80' : 'bg-indigo-400',
            )}
          />
        ))}
        {dayTodos.length > 3 && (
          <div className={cn(
            'w-1 h-1 md:w-1.5 md:h-1.5 rounded-full',
            isSelected ? 'bg-white/80' : 'bg-indigo-400',
          )}
          />
        )}
      </div>
    </div>
  )
}
