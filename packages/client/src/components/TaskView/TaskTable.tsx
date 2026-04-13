import type { Category, Todo } from '../../api'
import { format } from 'date-fns'
import { zhCN } from 'date-fns/locale'
import { Check, Trash2 } from 'lucide-react'
import { cn } from '../../lib/utils'

interface TaskTableProps {
  todos: Todo[]
  categories: Category[]
  onToggle: (id: string, completed: boolean) => void
  onDelete: (id: string) => void
}

export function TaskTable({ todos, categories, onToggle, onDelete }: TaskTableProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="border-b border-white/10">
            <th className="py-4 px-6 text-sm font-bold text-white/60 uppercase tracking-widest w-16">状态</th>
            <th className="py-4 px-6 text-sm font-bold text-white/60 uppercase tracking-widest">任务内容</th>
            <th className="py-4 px-6 text-sm font-bold text-white/60 uppercase tracking-widest">日期</th>
            <th className="py-4 px-6 text-sm font-bold text-white/60 uppercase tracking-widest">分类</th>
            <th className="py-4 px-6 text-sm font-bold text-white/60 uppercase tracking-widest w-20">操作</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/5">
          {todos.length === 0
            ? (
                <tr>
                  <td colSpan={5} className="py-20 text-center text-white/40">
                    暂无匹配任务
                  </td>
                </tr>
              )
            : (
                todos.map((todo) => {
                  const category = categories.find(c => c.id === todo.categoryId)
                  return (
                    <tr key={todo.id} className="group hover:bg-white/5 transition-colors">
                      <td className="py-4 px-6">
                        <button
                          onClick={() => onToggle(todo.id, todo.completed)}
                          className={cn(
                            'w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all',
                            todo.completed
                              ? 'bg-indigo-500 border-indigo-400'
                              : 'border-white/20 hover:border-white/40',
                          )}
                        >
                          {todo.completed && <Check className="w-4 h-4 text-white" />}
                        </button>
                      </td>
                      <td className="py-4 px-6">
                        <span className={cn(
                          'text-white font-medium transition-all',
                          todo.completed && 'text-white/30 line-through',
                        )}
                        >
                          {todo.text}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-white/60 text-sm">
                        {format(todo.date, 'yyyy-MM-dd', { locale: zhCN })}
                      </td>
                      <td className="py-4 px-6">
                        {category
                          ? (
                              <div className="flex items-center gap-2">
                                <div
                                  className="w-3 h-3 rounded-full"
                                  style={{ backgroundColor: category.color }}
                                />
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
  )
}
