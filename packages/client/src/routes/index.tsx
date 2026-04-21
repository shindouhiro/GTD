import { createFileRoute, redirect } from '@tanstack/react-router'
import { useState } from 'react'
import { AppHeader } from '@/components/AppHeader'
import { Calendar } from '@/components/Calendar'
import { DataToolbar } from '@/components/DataToolbar'
import { DateFilter } from '@/components/DateFilter'
import { TaskTable } from '@/components/TaskView/TaskTable'
import { type ViewMode, useViewOptions, ViewSwitcher } from '@/components/ViewSwitcher'
import { useTodos } from '@/hooks/useTodos'
import { authApi } from '@/lib/auth'
import { endOfDay, isSameDay, isWithinInterval, startOfDay, subMonths, subYears } from 'date-fns'

export type DateFilterType = 'today' | 'lastMonth' | 'lastYear' | 'all'

export const Route = createFileRoute('/')({
  beforeLoad: async () => {
    if (!authApi.isAuthenticated()) {
      throw redirect({ to: '/login' })
    }
  },
  component: App,
})

function App() {
  const { todos, categories, fetchData, addTodo, bulkAdd, bulkDelete, toggleTodo, deleteTodo, deleteMultiple } = useTodos()
  const [viewMode, setViewMode] = useState<ViewMode>('calendar')
  const [dateFilter, setDateFilter] = useState<DateFilterType>('today')
  const viewOptions = useViewOptions()

  const filteredTodos = todos.filter((todo) => {
    const todoDate = new Date(todo.date)
    const now = new Date()

    switch (dateFilter) {
      case 'today':
        return isSameDay(todoDate, now)
      case 'lastMonth':
        return isWithinInterval(todoDate, {
          start: startOfDay(subMonths(now, 1)),
          end: endOfDay(now),
        })
      case 'lastYear':
        return isWithinInterval(todoDate, {
          start: startOfDay(subYears(now, 1)),
          end: endOfDay(now),
        })
      case 'all':
      default:
        return true
    }
  })

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 py-12 px-4">
      <div className="max-w-7xl mx-auto">
        <AppHeader />

        {/* Unified Control Bar */}
        <div className="max-w-6xl mx-auto mb-8 relative group">
          <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/20 via-purple-500/20 to-indigo-500/20 rounded-3xl blur-2xl transition-all duration-700 opacity-50 group-hover:opacity-100" />
          <div className="relative bg-white/[0.03] backdrop-blur-2xl border border-white/10 rounded-3xl p-5 lg:p-6 shadow-2xl flex flex-col gap-6">
            <div className="flex flex-wrap items-center justify-between gap-4 lg:gap-6">
              <div className="shrink-0 w-full md:w-auto">
                <ViewSwitcher options={viewOptions} value={viewMode} onChange={setViewMode} />
              </div>

              <div className="w-full min-w-0 flex-1">
                <DataToolbar
                  todos={todos}
                  onRefresh={fetchData}
                />
              </div>
            </div>

            {viewMode === 'table' && (
              <div className="pt-5 border-t border-white/10 flex justify-center md:justify-start">
                <DateFilter
                  dateFilter={dateFilter}
                  onDateFilterChange={setDateFilter}
                />
              </div>
            )}
          </div>
        </div>

        {viewMode === 'calendar'
          ? (
              <Calendar
                todos={todos}
                categories={categories}
                onAddTodo={addTodo}
                onBulkAddTodo={bulkAdd}
                onBulkDeleteTodo={bulkDelete}
                onToggleTodo={toggleTodo}
                onDeleteTodo={deleteTodo}
              />
            )
          : (
              <div className="max-w-6xl mx-auto">
                <div className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-3xl p-4 md:p-6 shadow-xl">
                  <TaskTable
                    todos={filteredTodos}
                    categories={categories}
                    onToggle={toggleTodo}
                    onDelete={deleteTodo}
                    onDeleteMultiple={deleteMultiple}
                  />
                </div>
              </div>
            )}
      </div>
    </div>
  )
}
