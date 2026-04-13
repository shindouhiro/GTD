import React from 'react'
import { type Locale, format } from 'date-fns'
import { Check, Plus, Trash2 } from 'lucide-react'
import { Solar } from 'lunar-javascript'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'
import { CategoryBadge, CategoryPicker } from '@/components/CategoryComponents'
import type { Category, Todo } from '@/db'

interface DaySidePanelProps {
  selectedDate: Date | null
  selectedDateTodos: Todo[]
  categories: Category[]
  newTodoText: string
  setNewTodoText: (text: string) => void
  selectedCategoryForNewTodo: string | undefined
  setSelectedCategoryForNewTodo: (id: string | undefined) => void
  onAddTodo: (e: React.FormEvent) => void
  onToggleTodo: (id: string) => void
  onDeleteTodo: (id: string) => void
  isChinese: boolean
  dateLocale: Locale
}

export function DaySidePanel({
  selectedDate,
  selectedDateTodos,
  categories,
  newTodoText,
  setNewTodoText,
  selectedCategoryForNewTodo,
  setSelectedCategoryForNewTodo,
  onAddTodo,
  onToggleTodo,
  onDeleteTodo,
  isChinese,
  dateLocale,
}: DaySidePanelProps) {
  const { t } = useTranslation()

  return (
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

        {selectedDate ? (
          <>
            <form onSubmit={onAddTodo} className="mb-6 space-y-4 hidden lg:block">
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
              {selectedDateTodos.length === 0 ? (
                <div className="text-center text-white/40 py-8">
                  {t('home.noTasksForDay')}
                </div>
              ) : (
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
        ) : (
          <div className="flex-1 flex items-center justify-center text-white/40 text-center">
            <p>{t('home.selectDate')}</p>
          </div>
        )}
      </div>
    </div>
  )
}
