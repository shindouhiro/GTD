import { format, isSameDay } from 'date-fns'
import { enUS, zhCN } from 'date-fns/locale'
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react'
import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { CategoryPicker, CategorySelector } from '@/components/CategoryComponents'
import { Modal } from '@/components/Modal'
import { CalendarDayCell } from '@/components/CalendarView/CalendarDayCell'
import { DaySidePanel } from '@/components/CalendarView/DaySidePanel'
import { useCalendar } from '@/hooks/useCalendar'
import type { Category, Todo } from '@/db'

export type { Todo }

interface CalendarProps {
  todos: Array<Todo>
  categories: Array<Category>
  onAddTodo: (date: Date, text: string, categoryId?: string) => void
  onToggleTodo: (id: string) => void
  onDeleteTodo: (id: string) => void
}

export function Calendar({ todos, categories, onAddTodo, onToggleTodo, onDeleteTodo }: CalendarProps) {
  const { t, i18n } = useTranslation()
  const {
    currentMonth,
    selectedDate,
    monthStart,
    calendarDays,
    nextMonth,
    prevMonth,
    selectDate,
  } = useCalendar()
  
  const [newTodoText, setNewTodoText] = useState('')
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string | undefined>(undefined)
  const [selectedCategoryForNewTodo, setSelectedCategoryForNewTodo] = useState<string | undefined>(undefined)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const dateLocale = (i18n.resolvedLanguage ?? 'en').startsWith('zh') ? zhCN : enUS
  const isChinese = (i18n.resolvedLanguage ?? 'en').startsWith('zh')

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

  const handleAddTodoSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (selectedDate && newTodoText.trim()) {
      onAddTodo(selectedDate, newTodoText, selectedCategoryForNewTodo)
      setNewTodoText('')
      setSelectedCategoryForNewTodo(undefined)
      setIsModalOpen(false)
    }
  }

  // Filter todos by selected category
  const filteredTodos = selectedCategoryFilter
    ? todos.filter(todo => todo.categoryId === selectedCategoryFilter)
    : todos

  const selectedDateTodos = selectedDate
    ? filteredTodos.filter(todo => isSameDay(todo.date, selectedDate))
    : []

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
          onAddTodo={handleAddTodoSubmit}
          onToggleTodo={onToggleTodo}
          onDeleteTodo={onDeleteTodo}
          isChinese={isChinese}
          dateLocale={dateLocale}
        />
      </div>

      {/* Mobile Floating Action Button */}
      {selectedDate && (
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
        title={selectedDate
          ? t('calendar.addTaskForDate', { date: format(selectedDate, isChinese ? 'M月d日' : 'MMM d', { locale: dateLocale }) })
          : t('modal.addTask')}
      >
        <form onSubmit={handleAddTodoSubmit} className="space-y-4">
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
