import type { Category, Todo } from '../db'
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  isToday,
  startOfMonth,
  startOfWeek,
  subMonths,
} from 'date-fns'
import { enUS, zhCN } from 'date-fns/locale'
import { Check, ChevronLeft, ChevronRight, Plus, Trash2 } from 'lucide-react'
import { Solar } from 'lunar-javascript'
import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { cn } from '../lib/utils'
import { CategoryBadge, CategoryPicker, CategorySelector } from './CategoryComponents'
import { Modal } from './Modal'

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
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [newTodoText, setNewTodoText] = useState('')
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string | undefined>(undefined)
  const [selectedCategoryForNewTodo, setSelectedCategoryForNewTodo] = useState<string | undefined>(undefined)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const dateLocale = (i18n.resolvedLanguage ?? 'en').startsWith('zh') ? zhCN : enUS
  const isChinese = (i18n.resolvedLanguage ?? 'en').startsWith('zh')

  const monthStart = startOfMonth(currentMonth)
  const monthEnd = endOfMonth(monthStart)
  const startDate = startOfWeek(monthStart)
  const endDate = endOfWeek(monthEnd)

  const calendarDays = eachDayOfInterval({
    start: startDate,
    end: endDate,
  })

  const weekDays = [
    t('calendar.weekDays.sun'),
    t('calendar.weekDays.mon'),
    t('calendar.weekDays.tue'),
    t('calendar.weekDays.wed'),
    t('calendar.weekDays.thu'),
    t('calendar.weekDays.fri'),
    t('calendar.weekDays.sat'),
  ]

  const handlePrevMonth = () => setCurrentMonth(subMonths(currentMonth, 1))
  const handleNextMonth = () => setCurrentMonth(addMonths(currentMonth, 1))

  const handleDateClick = (day: Date) => {
    setSelectedDate(day)
    setNewTodoText('')
    setSelectedCategoryForNewTodo(undefined)
  }

  const handleAddTodo = (e: React.FormEvent) => {
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
        {/* Calendar Section */}
        <div className="flex-1 bg-white/10 backdrop-blur-lg border border-white/20 rounded-3xl p-3 md:p-6 shadow-xl">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-3xl font-bold text-white tracking-tight">
              {format(currentMonth, isChinese ? 'yyyy年M月' : 'MMMM yyyy', { locale: dateLocale })}
            </h2>
            <div className="flex gap-2">
              <button
                onClick={handlePrevMonth}
                className="p-2 hover:bg-white/10 rounded-full transition-colors text-white"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
              <button
                onClick={handleNextMonth}
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
            {calendarDays.map((day) => {
              const dayTodos = todos.filter(todo => isSameDay(todo.date, day))
              const isSelected = selectedDate && isSameDay(day, selectedDate)

              return (
                <div
                  key={day.toString()}
                  onClick={() => handleDateClick(day)}
                  className={cn(
                    'aspect-square relative flex flex-col items-center justify-center rounded-full md:rounded-2xl cursor-pointer transition-all duration-300 group',
                    !isSameMonth(day, monthStart) && 'opacity-30',
                    isSelected
                      ? 'bg-gradient-to-br from-indigo-500 to-purple-600 shadow-lg scale-105 z-10'
                      : 'hover:bg-white/5 bg-white/5 border border-white/5',
                    isToday(day) && !isSelected && 'border-indigo-400 border-2',
                  )}
                >
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
                        const lunar = Solar.fromDate(day).getLunar()
                        const festivals = lunar.getFestivals()
                        const solarTerms = lunar.getJieQi()
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
            })}
          </div>
        </div>

        {/* Todo List Section */}
        <div className={cn(
          'w-full lg:w-96 bg-white/10 backdrop-blur-lg border border-white/20 rounded-3xl p-6 shadow-xl transition-all duration-500',
          selectedDate ? 'opacity-100 translate-x-0' : 'opacity-50 translate-x-0 pointer-events-none lg:pointer-events-auto lg:opacity-100 lg:translate-x-0',
        )}
        >
          <div className="h-full flex flex-col">
            <div className="mb-6">
              <h3 className="text-2xl font-bold text-white">
                {selectedDate
                  ? format(selectedDate, isChinese ? 'M月d日 EEEE' : 'EEEE, MMMM do', { locale: dateLocale })
                  : t('home.selectDate')}
              </h3>
              {selectedDate && isChinese && (
                <div className="text-white/40 text-sm mt-1 font-medium">
                  {(() => {
                    const lunar = Solar.fromDate(selectedDate).getLunar()
                    return `农历 ${lunar.getMonthInChinese()}月${lunar.getDayInChinese()} · ${lunar.getYearInGanZhi()}${lunar.getYearShengXiao()}年`
                  })()}
                </div>
              )}
            </div>

            {selectedDate
              ? (
                  <>
                    <form onSubmit={handleAddTodo} className="mb-6 space-y-4 hidden lg:block">
                      <div className="relative">
                        <input
                          type="text"
                          value={newTodoText}
                          onChange={e => setNewTodoText(e.target.value)}
                          placeholder={t('home.addNewTask')}
                          className="w-full bg-black/20 border border-white/10 rounded-xl py-3 px-4 pr-12 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                        />
                        <button
                          type="submit"
                          disabled={!newTodoText.trim()}
                          className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 bg-indigo-500 rounded-lg text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-indigo-600 transition-colors"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>

                      <CategoryPicker
                        categories={categories}
                        selectedCategoryId={selectedCategoryForNewTodo}
                        onSelectCategory={setSelectedCategoryForNewTodo}
                      />
                    </form>

                    <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar max-h-[500px]">
                      {selectedDateTodos.length === 0
                        ? (
                            <div className="text-center text-white/40 py-8">
                              {t('home.noTasksForDay')}
                            </div>
                          )
                        : (
                            selectedDateTodos.map((todo) => {
                              const category = categories.find(c => c.id === todo.categoryId)
                              return (
                                <div
                                  key={todo.id}
                                  className="group flex items-center gap-3 bg-black/20 p-3 rounded-xl border border-white/5 hover:border-white/10 transition-all"
                                >
                                  <button
                                    onClick={() => onToggleTodo(todo.id)}
                                    className={cn(
                                      'w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all flex-shrink-0',
                                      todo.completed
                                        ? 'bg-green-500 border-green-500'
                                        : 'border-white/30 hover:border-indigo-400',
                                    )}
                                  >
                                    {todo.completed && <Check className="w-3.5 h-3.5 text-white" />}
                                  </button>
                                  <div className="flex-1 min-w-0">
                                    <span
                                      className={cn(
                                        'text-white/90 transition-all block',
                                        todo.completed && 'line-through text-white/40',
                                      )}
                                    >
                                      {todo.text}
                                    </span>
                                    {category && (
                                      <div className="mt-1">
                                        <CategoryBadge category={category} small />
                                      </div>
                                    )}
                                  </div>
                                  <button
                                    onClick={() => onDeleteTodo(todo.id)}
                                    className="opacity-0 group-hover:opacity-100 p-2 text-white/40 hover:text-red-400 transition-all flex-shrink-0"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              )
                            })
                          )}
                    </div>
                  </>
                )
              : (
                  <div className="flex-1 flex items-center justify-center text-white/40 text-center">
                    <p>{t('home.selectDate')}</p>
                  </div>
                )}
          </div>
        </div>
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
        <form onSubmit={handleAddTodo} className="space-y-4">
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
