import { createFileRoute, redirect } from '@tanstack/react-router'
import { useState } from 'react'
import { AppHeader } from '@/components/AppHeader'
import { Calendar } from '@/components/Calendar'
import { DataToolbar } from '@/components/DataToolbar'
import { TaskTable } from '@/components/TaskView/TaskTable'
import { type ViewMode, useViewOptions, ViewSwitcher } from '@/components/ViewSwitcher'
import { useTodos } from '@/hooks/useTodos'
import { authApi } from '@/lib/auth'

export const Route = createFileRoute('/')({
  beforeLoad: async () => {
    if (!authApi.isAuthenticated()) {
      throw redirect({ to: '/login' })
    }
  },
  component: App,
})

function App() {
  const { todos, categories, fetchData, addTodo, toggleTodo, deleteTodo, deleteMultiple } = useTodos()
  const [viewMode, setViewMode] = useState<ViewMode>('calendar')
  const viewOptions = useViewOptions()

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 py-12 px-4">
      <div className="max-w-7xl mx-auto">
        <AppHeader />

        {/* Unified Control Bar */}
        <div className="max-w-6xl mx-auto mb-8 bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-4 shadow-2xl flex flex-col xl:flex-row items-center justify-between gap-6">
          <ViewSwitcher options={viewOptions} value={viewMode} onChange={setViewMode} />

          <div className="w-full xl:w-auto">
            <DataToolbar todos={todos} onRefresh={fetchData} />
          </div>
        </div>

        {viewMode === 'calendar'
          ? (
              <Calendar
                todos={todos}
                categories={categories}
                onAddTodo={addTodo}
                onToggleTodo={toggleTodo}
                onDeleteTodo={deleteTodo}
              />
            )
          : (
              <div className="max-w-6xl mx-auto">
                <div className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-3xl p-4 md:p-6 shadow-xl">
                  <TaskTable
                    todos={todos}
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
