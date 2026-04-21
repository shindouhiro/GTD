import { addMonths, addWeeks, addYears, eachDayOfInterval, format, isSameDay, startOfDay } from 'date-fns'
import { enUS, zhCN } from 'date-fns/locale'
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react'
import React, { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { CategoryPicker, CategorySelector } from '@/components/CategoryComponents'
import { Modal } from '@/components/Modal'
import { CalendarDayCell } from '@/components/CalendarView/CalendarDayCell'
import { DaySidePanel } from '@/components/CalendarView/DaySidePanel'
import { type PlanningHorizon, PlanningHorizonSelector } from '@/components/CalendarView/PlanningHorizonSelector'
import { useCalendar } from '@/hooks/useCalendar'
import type { Category, Todo } from '@/db'

export type { Todo }

const PLANNING_HORIZON_STORAGE_KEY = 'calendar-planning-horizon'

const planningHorizonOptions: PlanningHorizon[] = ['selectedDate', 'week', 'month', 'year']

function isPlanningHorizon(value: string | null): value is PlanningHorizon {
  return value !== null && planningHorizonOptions.includes(value as PlanningHorizon)
}

function getPlanningTargetDate(horizon: PlanningHorizon, selectedDate: Date | null) {
  const today = startOfDay(new Date())
  switch (horizon) {
    case 'week':
      return addWeeks(today, 1)
    case 'month':
      return addMonths(today, 1)
    case 'year':
      return addYears(today, 1)
    case 'selectedDate':
    default:
      return selectedDate ?? today
  }
}

interface CalendarProps {
  todos: Array<Todo>
  categories: Array<Category>
  onAddTodo: (date: Date, text: string, categoryId?: string) => void
  onBulkAddTodo: (dates: Date[], text: string, categoryId?: string) => void
  onBulkDeleteTodo: (text: string, startDate: Date, endDate: Date) => void
  onToggleTodo: (id: string) => void
  onDeleteTodo: (id: string) => void
}

export function Calendar({ 
  todos, 
  categories, 
  onAddTodo, 
  onBulkAddTodo, 
  onBulkDeleteTodo,
  onToggleTodo, 
  onDeleteTodo 
}: CalendarProps) {
  const { t, i18n } = useTranslation()
  const {
    currentMonth,
    selectedDate,
    monthStart,
    calendarDays,
    nextMonth,
    prevMonth,
    selectDate,
    setCurrentMonth,
  } = useCalendar()
  
  const [newTodoText, setNewTodoText] = useState('')
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string | undefined>(undefined)
  const [selectedCategoryForNewTodo, setSelectedCategoryForNewTodo] = useState<string | undefined>(undefined)
  const [planningHorizon, setPlanningHorizon] = useState<PlanningHorizon>(() => {
    if (typeof window === 'undefined') {
      return 'selectedDate'
    }

    const storedHorizon = window.localStorage.getItem(PLANNING_HORIZON_STORAGE_KEY)
    return isPlanningHorizon(storedHorizon) ? storedHorizon : 'selectedDate'
  })
  const [isModalOpen, setIsModalOpen] = useState(false)
  const dateLocale = (i18n.resolvedLanguage ?? 'en').startsWith('zh') ? zhCN : enUS
  const isChinese = (i18n.resolvedLanguage ?? 'en').startsWith('zh')

  useEffect(() => {
    window.localStorage.setItem(PLANNING_HORIZON_STORAGE_KEY, planningHorizon)
  }, [planningHorizon])

  const planningTargetDate = useMemo(
    () => getPlanningTargetDate(planningHorizon, selectedDate),
    [planningHorizon, selectedDate],
  )

  const weekDays = [
    t('calendar.weekDays.sun'),
    t('calendar.weekDays.mon'),
    t('calendar.weekDays.tue'),
    t('calendar.weekDays.wed'),
    t('calendar.weekDays.thu'),
    t('calendar.weekDays.fri'),
    t('calendar.weekDays.sat'),
  ]

  const handleDateClick = (day: Date) => {
    selectDate(day)
    setNewTodoText('')
    setSelectedCategoryForNewTodo(undefined)
  }

  const handleDeleteTodo = (id: string) => {
    const todo = todos.find(t => t.id === id)
    if (!todo) return

    if (planningHorizon === 'selectedDate') {
      onDeleteTodo(id)
    } else {
      const start = startOfDay(new Date())
      const end = planningTargetDate
      const horizonText = planningHorizon === 'week' ? t('calendar.planningHorizon.week') : 
                         planningHorizon === 'month' ? t('calendar.planningHorizon.month') : 
                         t('calendar.planningHorizon.year')
      
      // Using a more detailed message in Chinese for better UX
      const confirmMessage = isChinese 
        ? `确认要删除 ${horizonText} 内所有名为 "${todo.text}" 的任务吗？`
        : t('calendar.confirmBulkDelete', { text: todo.text, horizon: horizonText })

      if (window.confirm(confirmMessage)) {
        onBulkDeleteTodo(todo.text, start, end)
      }
    }
  }

  const handleAddTodoSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newTodoText.trim()) {
      return
    }

    if (planningHorizon === 'selectedDate') {
      if (!selectedDate) return
      onAddTodo(selectedDate, newTodoText, selectedCategoryForNewTodo)
    } else {
      const start = startOfDay(new Date())
      const end = planningTargetDate
      
      // Generate all days in the interval [start, end]
      const dates = eachDayOfInterval({ start, end })
      
      onBulkAddTodo(dates, newTodoText, selectedCategoryForNewTodo)
      // Navigate to the end of the period to show progress
      setCurrentMonth(end)
    }

    setNewTodoText('')
    setSelectedCategoryForNewTodo(undefined)
    setIsModalOpen(false)
  }

  // Filter todos by selected category
  const filteredTodos = selectedCategoryFilter
    ? todos.filter(todo => todo.categoryId === selectedCategoryFilter)
    : todos

  const selectedDateTodos = selectedDate
    ? filteredTodos.filter(todo => isSameDay(todo.date, selectedDate))
    : []
  const canOpenMobileAddModal = selectedDate !== null || planningHorizon !== 'selectedDate'
  const mobileModalTargetDate = planningHorizon === 'selectedDate' ? selectedDate : planningTargetDate

  return (
    <div className="space-y-6">
      {/* Category Filter */}
      <div className="max-w-6xl mx-auto">
        <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-2xl p-4 shadow-xl">
          <h3 className="text-base font-semibold text-white mb-3">{t('home.filterByCategory')}</h3>
          <CategorySelector
            categories={categories}
            selectedCategoryId={selectedCategoryFilter}
            onSelectCategory={setSelectedCategoryFilter}
          />
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-8 w-full max-w-6xl mx-auto">
        {/* Calendar Grid Section */}
        <div className="flex-1 bg-white/10 backdrop-blur-lg border border-white/20 rounded-3xl p-3 md:p-6 shadow-xl">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-3xl font-bold text-white tracking-tight">
              {format(currentMonth, isChinese ? 'yyyy年M月' : 'MMMM yyyy', { locale: dateLocale })}
            </h2>
            <div className="flex gap-2">
              <button
                onClick={prevMonth}
                className="p-2 hover:bg-white/10 rounded-full transition-colors text-white"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
              <button
                onClick={nextMonth}
                className="p-2 hover:bg-white/10 rounded-full transition-colors text-white"
              >
                <ChevronRight className="w-6 h-6" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-1 md:gap-4 mb-4">
            {weekDays.map(day => (
              <div
                key={day}
                className="text-center text-sm font-medium text-white/60 uppercase tracking-wider"
              >
                {day}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1 md:gap-4">
            {calendarDays.map((day) => (
              <CalendarDayCell
                key={day.toString()}
                day={day}
                monthStart={monthStart}
                selectedDate={selectedDate}
                isChinese={isChinese}
                dayTodos={filteredTodos.filter(todo => isSameDay(todo.date, day))}
                onDateClick={handleDateClick}
              />
            ))}
          </div>
        </div>

        {/* Todo List Side Section */}
        <DaySidePanel
          selectedDate={selectedDate}
          selectedDateTodos={selectedDateTodos}
          categories={categories}
          newTodoText={newTodoText}
          setNewTodoText={setNewTodoText}
          selectedCategoryForNewTodo={selectedCategoryForNewTodo}
          setSelectedCategoryForNewTodo={setSelectedCategoryForNewTodo}
          planningHorizon={planningHorizon}
          setPlanningHorizon={setPlanningHorizon}
          planningTargetDate={planningTargetDate}
          onAddTodo={handleAddTodoSubmit}
          onToggleTodo={onToggleTodo}
          onDeleteTodo={handleDeleteTodo}
          isChinese={isChinese}
          dateLocale={dateLocale}
        />
      </div>

      {/* Mobile Floating Action Button */}
      {canOpenMobileAddModal && (
        <button
          id="calendar-mobile-add-task-button"
          onClick={() => setIsModalOpen(true)}
          className="fixed bottom-6 right-6 lg:hidden z-40 p-4 bg-indigo-500 hover:bg-indigo-600 text-white rounded-full shadow-2xl transition-all hover:scale-110 active:scale-95 flex items-center justify-center"
          aria-label={t('modal.addTask')}
        >
          <Plus className="w-6 h-6" />
        </button>
      )}

      {/* Mobile Add Task Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={mobileModalTargetDate
          ? t('calendar.addTaskForDate', { date: format(mobileModalTargetDate, isChinese ? 'M月d日' : 'MMM d', { locale: dateLocale }) })
          : t('modal.addTask')}
      >
        <form onSubmit={handleAddTodoSubmit} className="space-y-4">
          <PlanningHorizonSelector
            horizon={planningHorizon}
            onChange={setPlanningHorizon}
            targetDate={planningTargetDate}
            isChinese={isChinese}
            dateLocale={dateLocale}
            idPrefix="calendar-mobile"
          />

          <div className="relative">
            <input
              type="text"
              value={newTodoText}
              onChange={e => setNewTodoText(e.target.value)}
              placeholder={t('home.whatNeedsToBeDone')}
              className="w-full bg-black/20 border border-white/10 rounded-xl py-3 px-4 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-white/60 mb-2">{t('categoryPicker.category')}</label>
            <CategoryPicker
              categories={categories}
              selectedCategoryId={selectedCategoryForNewTodo}
              onSelectCategory={setSelectedCategoryForNewTodo}
            />
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={!newTodoText.trim()}
              className="w-full py-3 bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl text-white font-medium transition-all shadow-lg"
            >
              {t('home.addTask')}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
