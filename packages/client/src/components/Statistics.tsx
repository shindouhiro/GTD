import React, { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { endOfWeek, format, isSameDay, startOfDay, startOfWeek, subDays } from 'date-fns'
import { Calendar as CalendarIcon, CheckCircle2, Circle, Target, TrendingUp } from 'lucide-react'
import * as Icons from 'lucide-react'
import { cn } from '../lib/utils'
import type {Category, Todo} from '../db';

interface StatisticsProps {
  todos: Array<Todo>
  categories: Array<Category>
}

export function Statistics({ todos, categories }: StatisticsProps) {
  const { t } = useTranslation()
  const stats = useMemo(() => {
    const total = todos.length
    const completed = todos.filter(t => t.completed).length
    const pending = total - completed
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0

    // This week stats
    const now = new Date()
    const weekStart = startOfWeek(now)
    const weekEnd = endOfWeek(now)
    const thisWeekTodos = todos.filter(t => t.date >= weekStart && t.date <= weekEnd)
    const thisWeekCompleted = thisWeekTodos.filter(t => t.completed).length

    // Last 7 days data for chart
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = subDays(now, 6 - i)
      const dayTodos = todos.filter(t => isSameDay(t.date, date))
      const dayCompleted = dayTodos.filter(t => t.completed).length
      return {
        date,
        total: dayTodos.length,
        completed: dayCompleted,
        rate: dayTodos.length > 0 ? (dayCompleted / dayTodos.length) * 100 : 0
      }
    })

    // Daily average
    const daysWithTodos = new Set(todos.map(t => startOfDay(t.date).getTime())).size
    const avgPerDay = daysWithTodos > 0 ? (total / daysWithTodos).toFixed(1) : '0'

    // Best day
    const dayStats = todos.reduce((acc, todo) => {
      const dayKey = format(todo.date, 'yyyy-MM-dd')
      if (!acc[dayKey]) {
        acc[dayKey] = { total: 0, completed: 0, date: todo.date }
      }
      acc[dayKey].total++
      if (todo.completed) acc[dayKey].completed++
      return acc
    }, {} as Record<string, { total: number; completed: number; date: Date }>)

    const bestDay = Object.values(dayStats).reduce((best, current) => {
      const currentRate = current.total > 0 ? current.completed / current.total : 0
      const bestRate = best.total > 0 ? best.completed / best.total : 0
      return currentRate > bestRate ? current : best
    }, { total: 0, completed: 0, date: now })

    // Category statistics
    const categoryStats = categories.map(category => {
      const categoryTodos = todos.filter(t => t.categoryId === category.id)
      const categoryCompleted = categoryTodos.filter(t => t.completed).length
      const categoryRate = categoryTodos.length > 0 ? (categoryCompleted / categoryTodos.length) * 100 : 0

      return {
        category,
        total: categoryTodos.length,
        completed: categoryCompleted,
        pending: categoryTodos.length - categoryCompleted,
        completionRate: Math.round(categoryRate)
      }
    }).filter(stat => stat.total > 0) // Only show categories with tasks

    // Most productive category
    const mostProductiveCategory = categoryStats.reduce((best, current) => {
      return current.completed > best.completed ? current : best
    }, categoryStats[0] || null)

    return {
      total,
      completed,
      pending,
      completionRate,
      thisWeekTodos: thisWeekTodos.length,
      thisWeekCompleted,
      last7Days,
      avgPerDay,
      bestDay,
      categoryStats,
      mostProductiveCategory
    }
  }, [todos, categories])

  return (
    <div className="space-y-8">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          icon={<Target className="w-6 h-6" />}
          label={t('statistics.totalTasks')}
          value={stats.total}
          color="from-blue-500 to-cyan-500"
        />
        <StatCard
          icon={<CheckCircle2 className="w-6 h-6" />}
          label={t('statistics.completed')}
          value={stats.completed}
          color="from-green-500 to-emerald-500"
        />
        <StatCard
          icon={<Circle className="w-6 h-6" />}
          label={t('statistics.pending')}
          value={stats.pending}
          color="from-orange-500 to-amber-500"
        />
        <StatCard
          icon={<TrendingUp className="w-6 h-6" />}
          label={t('statistics.completionRate')}
          value={`${stats.completionRate}%`}
          color="from-purple-500 to-pink-500"
        />
      </div>

      {/* Main Stats Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Completion Rate Circle */}
        <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-3xl p-8 shadow-xl">
          <h3 className="text-2xl font-bold text-white mb-6">{t('statistics.overallProgress')}</h3>
          <div className="flex items-center justify-center">
            <div className="relative w-64 h-64">
              <svg className="w-full h-full transform -rotate-90">
                <circle
                  cx="128"
                  cy="128"
                  r="112"
                  stroke="rgba(255,255,255,0.1)"
                  strokeWidth="16"
                  fill="none"
                />
                <circle
                  cx="128"
                  cy="128"
                  r="112"
                  stroke="url(#gradient)"
                  strokeWidth="16"
                  fill="none"
                  strokeDasharray={`${2 * Math.PI * 112}`}
                  strokeDashoffset={`${2 * Math.PI * 112 * (1 - stats.completionRate / 100)}`}
                  strokeLinecap="round"
                  className="transition-all duration-1000 ease-out"
                />
                <defs>
                  <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#6366f1" />
                    <stop offset="100%" stopColor="#a855f7" />
                  </linearGradient>
                </defs>
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-6xl font-bold text-white">{stats.completionRate}%</span>
                <span className="text-white/60 mt-2">{t('statistics.complete')}</span>
              </div>
            </div>
          </div>
          <div className="mt-8 grid grid-cols-2 gap-4">
            <div className="text-center">
              <div className="text-3xl font-bold text-green-400">{stats.completed}</div>
              <div className="text-white/60 text-sm mt-1">{t('statistics.completed')}</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-orange-400">{stats.pending}</div>
              <div className="text-white/60 text-sm mt-1">{t('statistics.pending')}</div>
            </div>
          </div>
        </div>

        {/* Weekly Chart */}
        <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-3xl p-8 shadow-xl">
          <h3 className="text-2xl font-bold text-white mb-6">{t('statistics.last7Days')}</h3>
          <div className="space-y-4">
            {stats.last7Days.map((day, index) => (
              <div key={index} className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-white/80 font-medium">
                    {format(day.date, 'EEE, MMM d')}
                  </span>
                  <span className="text-white/60">
                    {day.completed}/{day.total}
                  </span>
                </div>
                <div className="relative h-3 bg-white/10 rounded-full overflow-hidden">
                  <div
                    className="absolute inset-y-0 left-0 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-500"
                    style={{ width: `${day.rate}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Additional Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-3xl p-6 shadow-xl">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-3 bg-indigo-500/20 rounded-xl">
              <CalendarIcon className="w-6 h-6 text-indigo-400" />
            </div>
            <h4 className="text-lg font-semibold text-white">{t('statistics.thisWeek')}</h4>
          </div>
          <div className="text-4xl font-bold text-white mb-2">
            {stats.thisWeekCompleted}/{stats.thisWeekTodos}
          </div>
          <p className="text-white/60 text-sm">{t('statistics.tasksCompletedThisWeek')}</p>
        </div>

        <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-3xl p-6 shadow-xl">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-3 bg-purple-500/20 rounded-xl">
              <TrendingUp className="w-6 h-6 text-purple-400" />
            </div>
            <h4 className="text-lg font-semibold text-white">{t('statistics.dailyAverage')}</h4>
          </div>
          <div className="text-4xl font-bold text-white mb-2">{stats.avgPerDay}</div>
          <p className="text-white/60 text-sm">{t('statistics.tasksPerDayOnAverage')}</p>
        </div>

        <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-3xl p-6 shadow-xl">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-3 bg-pink-500/20 rounded-xl">
              <CheckCircle2 className="w-6 h-6 text-pink-400" />
            </div>
            <h4 className="text-lg font-semibold text-white">{t('statistics.bestDay')}</h4>
          </div>
          <div className="text-2xl font-bold text-white mb-2">
            {stats.bestDay.total > 0 ? format(stats.bestDay.date, 'MMM d, yyyy') : 'N/A'}
          </div>
          <p className="text-white/60 text-sm">
            {stats.bestDay.total > 0
              ? `${stats.bestDay.completed}/${stats.bestDay.total} ${t('statistics.tasksCompletedThisWeek')}`
              : t('statistics.noTasksYet')}
          </p>
        </div>
      </div>

      {/* Category Statistics */}
      {stats.categoryStats.length > 0 && (
        <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-3xl p-8 shadow-xl">
          <h3 className="text-2xl font-bold text-white mb-6">{t('statistics.tasksByCategory')}</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {stats.categoryStats.map(({ category, total, completed, pending, completionRate }) => {
              const IconComponent = Icons[category.icon as keyof typeof Icons] as React.ComponentType<{ className?: string }>

              return (
                <div
                  key={category.id}
                  className="bg-black/20 rounded-2xl p-5 border border-white/5 hover:border-white/10 transition-all"
                >
                  <div className="flex items-center gap-3 mb-4">
                    <div
                      className="p-3 rounded-xl flex-shrink-0"
                      style={{ backgroundColor: category.color }}
                    >
                      {IconComponent && <IconComponent className="w-5 h-5 text-white" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-white font-semibold truncate">{category.name}</h4>
                      <p className="text-white/60 text-sm">{total} {t('statistics.tasks')}</p>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-white/80">{t('statistics.progress')}</span>
                      <span className="text-white font-semibold">{completionRate}%</span>
                    </div>
                    <div className="relative h-2 bg-white/10 rounded-full overflow-hidden">
                      <div
                        className="absolute inset-y-0 left-0 rounded-full transition-all duration-500"
                        style={{
                          width: `${completionRate}%`,
                          backgroundColor: category.color
                        }}
                      />
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-2 gap-3 mt-4">
                    <div className="bg-green-500/10 rounded-lg p-2 text-center">
                      <div className="text-green-400 font-bold text-lg">{completed}</div>
                      <div className="text-white/60 text-xs">{t('statistics.completed')}</div>
                    </div>
                    <div className="bg-orange-500/10 rounded-lg p-2 text-center">
                      <div className="text-orange-400 font-bold text-lg">{pending}</div>
                      <div className="text-white/60 text-xs">{t('statistics.pending')}</div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Most Productive Category */}
          {stats.mostProductiveCategory && (
            <div className="mt-6 bg-gradient-to-r from-indigo-500/20 to-purple-500/20 rounded-2xl p-6 border border-indigo-500/30">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-xl">
                  <TrendingUp className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1">
                  <h4 className="text-white/80 text-sm font-medium">{t('statistics.mostProductiveCategory')}</h4>
                  <div className="flex items-center gap-2 mt-1">
                    {(() => {
                      const IconComponent = Icons[stats.mostProductiveCategory.category.icon as keyof typeof Icons] as React.ComponentType<{ className?: string }>
                      return IconComponent && <IconComponent className="w-4 h-4 text-white" />
                    })()}
                    <span className="text-white font-bold text-lg">
                      {stats.mostProductiveCategory.category.name}
                    </span>
                    <span className="text-white/60 text-sm">
                      ({stats.mostProductiveCategory.completed} completed)
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

interface StatCardProps {
  icon: React.ReactNode
  label: string
  value: string | number
  color: string
}

function StatCard({ icon, label, value, color }: StatCardProps) {
  return (
    <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-3xl p-6 shadow-xl hover:scale-105 transition-transform duration-300">
      <div className="flex items-center gap-4">
        <div className={cn('p-4 rounded-2xl bg-gradient-to-br', color)}>
          {icon}
        </div>
        <div>
          <div className="text-3xl font-bold text-white">{value}</div>
          <div className="text-white/60 text-sm mt-1">{label}</div>
        </div>
      </div>
    </div>
  )
}
