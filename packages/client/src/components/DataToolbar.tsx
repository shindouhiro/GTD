import type { Todo } from '@/api'
import { Download, Info, Trash2, Upload } from 'lucide-react'
import React, { useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { api } from '@/api'
import { cn } from '@/lib/utils'

interface DataToolbarProps {
  todos: Array<Todo>
  onRefresh?: () => void
}

export function DataToolbar({ todos, onRefresh }: DataToolbarProps) {
  const { t } = useTranslation()
  const fileInputRef = useRef<HTMLInputElement>(null)

  // 导出数据为 JSON
  const handleExport = () => {
    const dataStr = JSON.stringify(todos, null, 2)
    const dataBlob = new Blob([dataStr], { type: 'application/json' })
    const url = URL.createObjectURL(dataBlob)
    const link = document.createElement('a')
    link.href = url
    link.download = `todo-backup-${new Date().toISOString().split('T')[0]}.json`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  // 导入数据
  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file)
      return

    const reader = new FileReader()
    reader.onload = async (e) => {
      try {
        const content = e.target?.result as string
        const importedTodos = JSON.parse(content) as Array<Todo>

        // 验证数据格式
        if (!Array.isArray(importedTodos)) {
          alert(t('dataToolbar.invalidFileFormat'))
          return
        }

        // 转换日期字符串为 Date 对象
        const validTodos = importedTodos.map(todo => ({
          ...todo,
          date: new Date(todo.date),
        }))

        // 清空现有数据并导入新数据
        await api.todos.clear()
        await api.todos.bulkAdd(validTodos)

        onRefresh?.()

        alert(t('dataToolbar.importSuccess', { count: validTodos.length }))
      }
      catch (error) {
        console.error('Import error:', error)
        alert(t('dataToolbar.importFailed'))
      }
    }
    reader.readAsText(file)

    // 重置 input
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  // 清空所有数据
  const handleClearAll = async () => {
    if (todos.length === 0) {
      alert(t('dataToolbar.noDataToClear'))
      return
    }

    const confirmed = window.confirm(
      t('dataToolbar.clearAllConfirm', { count: todos.length }),
    )

    if (confirmed) {
      await api.todos.clear()
      onRefresh?.()
      alert(t('dataToolbar.allDataCleared'))
    }
  }

  // 统计信息
  const stats = {
    total: todos.length,
    completed: todos.filter(t => t.completed).length,
    pending: todos.filter(t => !t.completed).length,
  }

  return (
    <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-2xl p-4 shadow-xl">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        {/* 统计信息 */}
        <div className="flex items-center gap-3 text-white/80">
          <Info className="w-5 h-5 text-indigo-400" />
          <div className="text-sm">
            <span className="font-semibold text-white">{stats.total}</span>
            {' '}
            {t('dataToolbar.total')}
            <span className="mx-2">•</span>
            <span className="font-semibold text-green-400">{stats.completed}</span>
            {' '}
            {t('dataToolbar.done')}
            <span className="mx-2">•</span>
            <span className="font-semibold text-yellow-400">{stats.pending}</span>
            {' '}
            {t('dataToolbar.pending')}
          </div>
        </div>

        {/* 操作按钮 */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            onClick={handleExport}
            disabled={todos.length === 0}
            className={cn(
              'flex-1 sm:flex-none flex items-center gap-2 px-4 py-2 rounded-xl transition-all',
              'bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 border border-indigo-500/30',
              'disabled:opacity-50 disabled:cursor-not-allowed',
            )}
            title={t('dataToolbar.exportAllTodos')}
          >
            <Download className="w-4 h-4" />
            <span className="text-sm font-medium">{t('dataToolbar.export')}</span>
          </button>

          <button
            onClick={() => fileInputRef.current?.click()}
            className={cn(
              'flex-1 sm:flex-none flex items-center gap-2 px-4 py-2 rounded-xl transition-all',
              'bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border border-purple-500/30',
            )}
            title={t('dataToolbar.importTodos')}
          >
            <Upload className="w-4 h-4" />
            <span className="text-sm font-medium">{t('dataToolbar.import')}</span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={handleImport}
            className="hidden"
          />

          <button
            onClick={handleClearAll}
            disabled={todos.length === 0}
            className={cn(
              'flex-1 sm:flex-none flex items-center gap-2 px-4 py-2 rounded-xl transition-all',
              'bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/30',
              'disabled:opacity-50 disabled:cursor-not-allowed',
            )}
            title={t('dataToolbar.clearAllTodos')}
          >
            <Trash2 className="w-4 h-4" />
            <span className="text-sm font-medium">{t('dataToolbar.clear')}</span>
          </button>
        </div>
      </div>
    </div>
  )
}
