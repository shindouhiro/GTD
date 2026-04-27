import type { Category, Todo } from '@/api'
import { format } from 'date-fns'
import { zhCN } from 'date-fns/locale'
import { Check, CheckSquare, Square, Trash2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'
import { useTaskSelection } from '@/hooks/useTaskSelection'

interface TaskTableProps {
  todos: Todo[]
  categories: Category[]
  onToggle: (id: string, completed: boolean) => void
  onDelete: (id: string) => void
  onDeleteMultiple?: (ids: string[]) => void
}

export function TaskTable({ todos, categories, onToggle, onDelete, onDeleteMultiple }: TaskTableProps) {
  const { t } = useTranslation()
  const todoIds = todos.map(t => t.id)
  
  const {
    selectedIds,
    isAllSelected,
    isSomeSelected,
    toggleSelectAll,
    toggleSelectOne,
    clearSelection,
  } = useTaskSelection(todoIds)

  const handleDeleteSelected = () => {
    if (onDeleteMultiple) {
      onDeleteMultiple(Array.from(selectedIds))
      clearSelection()
    }
  }

  return (
    <div className="w-full space-y-4">
      {/* Bulk Action Bar */}
      <div className={cn(
        'flex items-center justify-between bg-gradient-to-r from-theme-primary/10 to-theme-accent/10 border border-theme-primary/20 rounded-2xl px-6 py-3 transition-all duration-300',
        selectedIds.size > 0 ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4 pointer-events-none h-0 p-0 overflow-hidden',
      )}
      >
        <div className="flex items-center gap-3">
          <div className="bg-gradient-to-br from-theme-primary to-theme-accent text-white text-xs font-bold px-2 py-1 rounded-md shadow-sm">
            {selectedIds.size}
          </div>
          <span className="text-white font-medium">{t('table.selectedCount', { count: selectedIds.size })}</span>
        </div>
        <button
          onClick={handleDeleteSelected}
          className="flex items-center gap-2 bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-xl text-sm font-bold transition-all shadow-lg shadow-red-500/20"
        >
          <Trash2 className="w-4 h-4" />
          {t('table.deleteSelected')}
        </button>
      </div>

      {/* Desktop Table View */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-white/10">
              <th className="py-4 px-6 w-12 text-center">
                <button
                  onClick={toggleSelectAll}
                  className="text-white/40 hover:text-white transition-colors"
                >
                  {isAllSelected ? <CheckSquare className="w-5 h-5 text-theme-primary" /> : isSomeSelected ? <CheckSquare className="w-5 h-5 text-theme-primary/50" /> : <Square className="w-5 h-5" />}
                </button>
              </th>
              <th className="py-4 px-6 text-sm font-bold text-white/60 uppercase tracking-widest">{t('table.content')}</th>
              <th className="py-4 px-6 text-sm font-bold text-white/60 uppercase tracking-widest">{t('table.date')}</th>
              <th className="py-4 px-6 text-sm font-bold text-white/60 uppercase tracking-widest">{t('table.category')}</th>
              <th className="py-4 px-6 text-sm font-bold text-white/60 uppercase tracking-widest w-20">{t('table.actions')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {todos.length === 0
              ? (
                <tr>
                  <td colSpan={6} className="py-20 text-center text-white/40">{t('table.noMatchingTasks')}</td>
                </tr>
              )
              : (
                todos.map((todo) => {
                  const category = categories.find(c => c.id === todo.categoryId)
                  const isSelected = selectedIds.has(todo.id)
                  return (
                    <tr
                      key={todo.id}
                      className={cn(
                        'group transition-colors',
                        isSelected ? 'bg-indigo-500/5' : 'hover:bg-white/5',
                      )}
                    >
                      <td className="py-4 px-6 text-center">
                        <button
                          onClick={() => toggleSelectOne(todo.id)}
                          className={cn(
                            'transition-colors',
                            isSelected ? 'text-theme-primary' : 'text-white/20 group-hover:text-white/40',
                          )}
                        >
                          {isSelected ? <CheckSquare className="w-5 h-5" /> : <Square className="w-5 h-5" />}
                        </button>
                      </td>

                      <td className="py-4 px-6">
                        <span className={cn('text-white font-medium transition-all', todo.completed && 'text-white/30 line-through')}>
                          {todo.text}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-white/60 text-sm">
                        {format(new Date(todo.date), 'yyyy-MM-dd', { locale: zhCN })}
                      </td>
                      <td className="py-4 px-6">
                        {category
                          ? (
                            <div className="flex items-center gap-2">
                              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: category.color }} />
                              <span className="text-white/80 text-sm font-medium">{category.name}</span>
                            </div>
                          )
                          : (
                            <span className="text-white/20 text-sm">—</span>
                          )}
                      </td>
                      <td className="py-4 px-6">
                        <button
                          onClick={() => onDelete(todo.id)}
                          className="p-2 text-white/20 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </td>
                    </tr>
                  )
                })
              )}
          </tbody>
        </table>
      </div>

      {/* Mobile Card View */}
      <div className="md:hidden space-y-4">
        {todos.length === 0
          ? (
            <div className="py-12 text-center text-white/40">{t('table.noMatchingTasks')}</div>
          )
          : (
            todos.map((todo) => {
              const category = categories.find(c => c.id === todo.categoryId)
              const isSelected = selectedIds.has(todo.id)
              return (
                <div
                  key={todo.id}
                  className={cn(
                    'bg-white/5 border rounded-2xl p-4 flex items-center gap-4 transition-all relative',
                    isSelected ? 'border-indigo-500/50 bg-indigo-500/5' : 'border-white/10',
                  )}
                  onClick={() => toggleSelectOne(todo.id)}
                >
                  <div className="absolute top-2 right-2">
                    {isSelected ? <CheckSquare className="w-4 h-4 text-indigo-400" /> : <Square className="w-4 h-4 text-white/10" />}
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      onToggle(todo.id, todo.completed)
                    }}
                    className={cn(
                      'w-8 h-8 flex-shrink-0 rounded-xl border-2 flex items-center justify-center transition-all',
                      todo.completed ? 'bg-theme-primary border-white/20' : 'border-white/20',
                    )}
                  >
                    {todo.completed && <Check className="w-5 h-5 text-white" />}
                  </button>
                  <div className="flex-1 min-w-0">
                    <h4 className={cn('text-white font-semibold truncate', todo.completed && 'text-white/30 line-through')}>
                      {todo.text}
                    </h4>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-xs text-white/40">
                        {format(new Date(todo.date), 'MM-dd', { locale: zhCN })}
                      </span>
                      {category && (
                        <div className="flex items-center gap-1.5 bg-white/5 px-2 py-0.5 rounded-full border border-white/5">
                          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: category.color }} />
                          <span className="text-[10px] text-white/60 font-medium">{category.name}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      onDelete(todo.id)
                    }}
                    className="p-2 text-white/20 hover:text-red-400 transition-all"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              )
            })
          )}
      </div>
    </div>
  )
}
