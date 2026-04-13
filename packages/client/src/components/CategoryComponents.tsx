import type { Category } from '@/db'
import * as Icons from 'lucide-react'
import React from 'react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'

interface CategorySelectorProps {
  categories: Array<Category>
  selectedCategoryId?: string
  onSelectCategory: (categoryId: string | undefined) => void
}

export function CategorySelector({ categories, selectedCategoryId, onSelectCategory }: CategorySelectorProps) {
  const { t } = useTranslation()
  const GridIcon = Icons.Grid3x3 as React.ComponentType<{ className?: string }>

  return (
    <div className="flex flex-wrap gap-2">
      <button
        onClick={() => onSelectCategory(undefined)}
        className={cn(
          'flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-all duration-300 min-w-[100px] justify-center',
          !selectedCategoryId
            ? 'bg-white/20 text-white shadow-lg scale-105'
            : 'bg-white/5 text-white/60 hover:bg-white/10',
        )}
      >
        <GridIcon className="w-4 h-4" />
        {t('home.all')}
      </button>
      {categories.map((category) => {
        const IconComponent = Icons[category.icon as keyof typeof Icons] as React.ComponentType<{ className?: string }>
        const isSelected = selectedCategoryId === category.id

        return (
          <button
            key={category.id}
            onClick={() => onSelectCategory(category.id)}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-all duration-300 min-w-[100px] justify-center',
              isSelected
                ? 'text-white shadow-lg scale-105'
                : 'bg-white/5 text-white/60 hover:bg-white/10',
            )}
            style={isSelected ? { backgroundColor: category.color } : {}}
          >
            {IconComponent && <IconComponent className="w-4 h-4" />}
            {category.name}
          </button>
        )
      })}
    </div>
  )
}

interface CategoryBadgeProps {
  category?: Category
  small?: boolean
}

export function CategoryBadge({ category, small = false }: CategoryBadgeProps) {
  if (!category)
    return null

  const IconComponent = Icons[category.icon as keyof typeof Icons] as React.ComponentType<{ className?: string }>

  return (
    <div
      className={cn(
        'inline-flex items-center gap-1.5 rounded-lg font-medium text-white',
        small ? 'px-2 py-1 text-xs' : 'px-3 py-1.5 text-sm',
      )}
      style={{ backgroundColor: category.color }}
    >
      {IconComponent && <IconComponent className={small ? 'w-3 h-3' : 'w-4 h-4'} />}
      {category.name}
    </div>
  )
}

interface CategoryPickerProps {
  categories: Array<Category>
  selectedCategoryId?: string
  onSelectCategory: (categoryId: string | undefined) => void
}

export function CategoryPicker({ categories, selectedCategoryId, onSelectCategory }: CategoryPickerProps) {
  const { t } = useTranslation()
  return (
    <div className="space-y-3">
      <label className="text-white/80 text-sm font-medium">{t('categoryPicker.categoryOptional')}</label>
      <div className="grid grid-cols-2 gap-2">
        {categories.map((category) => {
          const IconComponent = Icons[category.icon as keyof typeof Icons] as React.ComponentType<{ className?: string }>
          const isSelected = selectedCategoryId === category.id

          return (
            <button
              key={category.id}
              type="button"
              onClick={() => onSelectCategory(isSelected ? undefined : category.id)}
              className={cn(
                'flex items-center gap-2 px-3 py-2 rounded-xl font-medium transition-all duration-300 border-2',
                isSelected
                  ? 'text-white shadow-lg scale-105'
                  : 'bg-white/5 text-white/60 hover:bg-white/10 border-white/10',
              )}
              style={isSelected
                ? {
                    backgroundColor: category.color,
                    borderColor: category.color,
                  }
                : {}}
            >
              {IconComponent && <IconComponent className="w-4 h-4" />}
              <span className="text-sm">{category.name}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
