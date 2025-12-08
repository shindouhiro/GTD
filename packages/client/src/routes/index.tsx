import { Link, createFileRoute, redirect } from '@tanstack/react-router'
import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {   api } from '../api'
import { Calendar } from '../components/Calendar'
import { DataToolbar } from '../components/DataToolbar'
import { LanguageSwitcher } from '../components/LanguageSwitcher'
import { generateUUID } from '../lib/uuid'
import { authApi } from '../lib/auth'
import type {Category, Todo} from '../api';

export const Route = createFileRoute('/')({
  beforeLoad: async () => {
    if (!authApi.isAuthenticated()) {
      throw redirect({ to: '/login' })
    }
  },
  component: App,
})

function App() {
  const { t } = useTranslation()
  const [todos, setTodos] = useState<Array<Todo>>([])
  const [categories, setCategories] = useState<Array<Category>>([])

  const fetchData = useCallback(async () => {
    try {
      const [todosData, categoriesData] = await Promise.all([
        api.todos.getAll(),
        api.categories.getAll()
      ])
      setTodos(todosData)
      setCategories(categoriesData)
    } catch (error) {
      console.error('Failed to fetch data:', error)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleAddTodo = async (date: Date, text: string, categoryId?: string) => {
    await api.todos.add({
      id: generateUUID(),
      text,
      completed: false,
      date,
      categoryId,
    })
    await fetchData()
  }

  const handleToggleTodo = async (id: string) => {
    const todo = todos.find(t => t.id === id)
    if (todo) {
      await api.todos.update(id, { completed: !todo.completed })
      await fetchData()
    }
  }

  const handleDeleteTodo = async (id: string) => {
    await api.todos.delete(id)
    await fetchData()
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 py-12 px-4">
      <div className="max-w-7xl mx-auto">
        <header className="mb-12 text-center">
          <div className="flex flex-col md:flex-row items-center justify-center gap-6 md:gap-8 mb-8">
            <h1 className="text-4xl md:text-5xl font-bold text-white tracking-tight">
              {t('home.title')}
            </h1>
            <div className="flex items-center gap-3">
              <LanguageSwitcher />
              <Link
                to="/statistics"
                className="group flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 rounded-xl text-white font-medium transition-all hover:scale-105 shadow-lg text-sm md:text-base"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                  />
                </svg>
                {t('navigation.statistics')}
              </Link>
              <Link
                to="/categories"
                className="group flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 rounded-xl text-white font-medium transition-all hover:scale-105 shadow-lg text-sm md:text-base"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
                  />
                </svg>
                {t('navigation.categories')}
              </Link>
              <button
                onClick={() => {
                  authApi.logout()
                  window.location.href = '/login'
                }}
                className="group flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 rounded-xl text-white font-medium transition-all hover:scale-105 shadow-lg text-sm md:text-base"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                  />
                </svg>
                {t('navigation.logout')}
              </button>
            </div>
          </div>
          <p className="text-white/60 text-lg">{t('home.subtitle')}</p>
        </header>

        {/* Data Management Toolbar */}
        <div className="mb-8 max-w-6xl mx-auto">
          <DataToolbar todos={todos} onRefresh={fetchData} />
        </div>

        <Calendar
          todos={todos}
          categories={categories}
          onAddTodo={handleAddTodo}
          onToggleTodo={handleToggleTodo}
          onDeleteTodo={handleDeleteTodo}
        />
      </div>
    </div>
  )
}
