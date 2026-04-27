import type { Category } from '@/api'
import { createFileRoute, Link, redirect } from '@tanstack/react-router'
import { ArrowLeft } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { api } from '@/api'
import { CategoryManager } from '@/components/CategoryManager'
import { authApi } from '@/lib/auth'
import { generateUUID } from '@/lib/uuid'

export const Route = createFileRoute('/categories')({
  beforeLoad: async () => {
    if (!authApi.isAuthenticated()) {
      throw redirect({ to: '/login' })
    }
  },
  component: CategoriesPage,
})

function CategoriesPage() {
  const { t } = useTranslation()
  const [categories, setCategories] = useState<Array<Category>>([])

  const fetchCategories = useCallback(async () => {
    try {
      const data = await api.categories.getAll()
      setCategories(data)
    }
    catch (error) {
      console.error('Failed to fetch categories:', error)
    }
  }, [])

  useEffect(() => {
    fetchCategories()
  }, [fetchCategories])

  const handleAddCategory = async (category: Omit<Category, 'id'>) => {
    await api.categories.add({
      id: generateUUID(),
      ...category,
    })
    await fetchCategories()
  }

  const handleUpdateCategory = async (id: string, updates: Partial<Category>) => {
    await api.categories.update(id, updates)
    await fetchCategories()
  }

  const handleDeleteCategory = async (id: string) => {
    await api.categories.delete(id)
    await fetchCategories()
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 px-4 py-6 md:py-10 lg:py-12">
      <div className="mx-auto max-w-5xl">
        <header className="mb-8 md:mb-12">
          <Link
            id="categories-back-to-home-link"
            to="/"
            className="inline-flex items-center gap-2 text-white/60 hover:text-white transition-colors mb-6"
          >
            <ArrowLeft className="w-4 h-4" />
            {t('navigation.backToCalendar')}
          </Link>
          <h1 className="mb-3 text-3xl font-bold tracking-tight text-white sm:text-4xl md:mb-4 md:text-5xl">
            {t('categories.title')}
          </h1>
          <p className="text-base text-white/60 md:text-lg">{t('categories.subtitle')}</p>
        </header>

        <CategoryManager
          categories={categories}
          onAddCategory={handleAddCategory}
          onUpdateCategory={handleUpdateCategory}
          onDeleteCategory={handleDeleteCategory}
        />
      </div>
    </div>
  )
}
