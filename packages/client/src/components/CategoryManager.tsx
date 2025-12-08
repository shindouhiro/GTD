import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import * as Icons from 'lucide-react'
import { Check, Edit2, Plus, Trash2 } from 'lucide-react'
import { cn } from '../lib/utils'
import type {Category} from '../api';

interface CategoryManagerProps {
  categories: Array<Category>
  onAddCategory: (category: Omit<Category, 'id'>) => void
  onUpdateCategory: (id: string, category: Partial<Category>) => void
  onDeleteCategory: (id: string) => void
}

// Available icons for categories
const AVAILABLE_ICONS = [
  'Briefcase', 'User', 'ShoppingCart', 'Heart', 'BookOpen', 'Home',
  'Coffee', 'Dumbbell', 'Music', 'Plane', 'Camera', 'Code',
  'Palette', 'Gamepad2', 'Utensils', 'Car', 'GraduationCap', 'Stethoscope'
] as const

// Predefined color palette
const COLOR_PALETTE = [
  '#3b82f6', // blue
  '#10b981', // green
  '#f59e0b', // orange
  '#ef4444', // red
  '#8b5cf6', // purple
  '#ec4899', // pink
  '#06b6d4', // cyan
  '#84cc16', // lime
  '#f97316', // orange-600
  '#6366f1', // indigo
  '#14b8a6', // teal
  '#a855f7', // purple-500
]

export function CategoryManager({ categories, onAddCategory, onUpdateCategory, onDeleteCategory }: CategoryManagerProps) {
  const { t } = useTranslation()
  const [isAdding, setIsAdding] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formData, setFormData] = useState({ name: '', icon: 'Briefcase', color: '#3b82f6' })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (formData.name.trim()) {
      if (editingId) {
        onUpdateCategory(editingId, formData)
        setEditingId(null)
      } else {
        onAddCategory(formData)
        setIsAdding(false)
      }
      setFormData({ name: '', icon: 'Briefcase', color: '#3b82f6' })
    }
  }

  const handleEdit = (category: Category) => {
    setEditingId(category.id)
    setFormData({ name: category.name, icon: category.icon, color: category.color })
    setIsAdding(true)
  }

  const handleCancel = () => {
    setIsAdding(false)
    setEditingId(null)
    setFormData({ name: '', icon: 'Briefcase', color: '#3b82f6' })
  }

  const handleDelete = (id: string) => {
    if (window.confirm(t('categories.deleteCategoryConfirm'))) {
      onDeleteCategory(id)
    }
  }

  return (
    <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-3xl p-8 shadow-xl">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-white">{t('categories.manageCategories')}</h2>
        {!isAdding && (
          <button
            onClick={() => setIsAdding(true)}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 rounded-xl text-white font-medium transition-all hover:scale-105 shadow-lg"
          >
            <Plus className="w-4 h-4" />
            {t('categories.addCategory')}
          </button>
        )}
      </div>

      {/* Add/Edit Form */}
      {isAdding && (
        <form onSubmit={handleSubmit} className="mb-6 bg-black/20 rounded-2xl p-6 space-y-4">
          <h3 className="text-lg font-semibold text-white mb-4">
            {editingId ? t('categories.editCategory') : t('categories.newCategory')}
          </h3>

          {/* Name Input */}
          <div>
            <label className="block text-white/80 text-sm font-medium mb-2">{t('categories.categoryName')}</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder={t('categories.enterCategoryName')}
              className="w-full bg-black/20 border border-white/10 rounded-xl py-3 px-4 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
              autoFocus
            />
          </div>

          {/* Icon Selector */}
          <div>
            <label className="block text-white/80 text-sm font-medium mb-2">{t('categories.icon')}</label>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
              {AVAILABLE_ICONS.map((iconName) => {
                const IconComponent = Icons[iconName as keyof typeof Icons] as React.ComponentType<{ className?: string }>
                const isSelected = formData.icon === iconName
                return (
                  <button
                    key={iconName}
                    type="button"
                    onClick={() => setFormData({ ...formData, icon: iconName })}
                    className={cn(
                      'p-3 rounded-xl transition-all duration-200 border-2',
                      isSelected
                        ? 'bg-indigo-500 border-indigo-400 scale-110'
                        : 'bg-white/5 border-white/10 hover:bg-white/10'
                    )}
                  >
                    {IconComponent && <IconComponent className="w-5 h-5 text-white mx-auto" />}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Color Picker */}
          <div>
            <label className="block text-white/80 text-sm font-medium mb-2">{t('categories.color')}</label>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
              {COLOR_PALETTE.map((color) => {
                const isSelected = formData.color === color
                return (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setFormData({ ...formData, color })}
                    className={cn(
                      'w-full aspect-square rounded-xl transition-all duration-200 border-2 flex items-center justify-center',
                      isSelected ? 'border-white scale-110' : 'border-transparent hover:scale-105'
                    )}
                    style={{ backgroundColor: color }}
                  >
                    {isSelected && <Check className="w-5 h-5 text-white" />}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={!formData.name.trim()}
              className="flex-1 px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 rounded-xl text-white font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {editingId ? t('common.update') : t('common.create')}
            </button>
            <button
              type="button"
              onClick={handleCancel}
              className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-xl text-white font-medium transition-all"
            >
              {t('common.cancel')}
            </button>
          </div>
        </form>
      )}

      {/* Categories List */}
      <div className="space-y-3">
        {categories.length === 0 ? (
          <div className="text-center text-white/40 py-8">
            {t('categories.noCategoriesYet')}
          </div>
        ) : (
          categories.map((category) => {
            const IconComponent = Icons[category.icon as keyof typeof Icons] as React.ComponentType<{ className?: string }>
            return (
              <div
                key={category.id}
                className="group flex items-center gap-4 bg-black/20 p-4 rounded-xl border border-white/5 hover:border-white/10 transition-all"
              >
                <div
                  className="p-3 rounded-xl flex-shrink-0"
                  style={{ backgroundColor: category.color }}
                >
                  {IconComponent && <IconComponent className="w-5 h-5 text-white" />}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-white font-medium">{category.name}</h4>
                  <p className="text-white/40 text-sm">{category.color}</p>
                </div>
                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => handleEdit(category)}
                    className="p-2 text-white/60 hover:text-blue-400 transition-colors"
                    title="Edit category"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(category.id)}
                    className="p-2 text-white/60 hover:text-red-400 transition-colors"
                    title="Delete category"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
