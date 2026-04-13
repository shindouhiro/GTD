import type { Category, Todo } from '@/api'
import { useCallback, useEffect, useState } from 'react'
import { api } from '@/api'
import { generateUUID } from '@/lib/uuid'

export function useTodos() {
  const [todos, setTodos] = useState<Array<Todo>>([])
  const [categories, setCategories] = useState<Array<Category>>([])

  const fetchData = useCallback(async () => {
    try {
      const [todosData, categoriesData] = await Promise.all([
        api.todos.getAll(),
        api.categories.getAll(),
      ])
      setTodos(todosData)
      setCategories(categoriesData)
    }
    catch (error) {
      console.error('Failed to fetch data:', error)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const addTodo = useCallback(async (date: Date, text: string, categoryId?: string) => {
    await api.todos.add({
      id: generateUUID(),
      text,
      completed: false,
      date,
      categoryId,
    })
    await fetchData()
  }, [fetchData])

  const toggleTodo = useCallback(async (id: string) => {
    const todo = todos.find(t => t.id === id)
    if (todo) {
      await api.todos.update(id, { completed: !todo.completed })
      await fetchData()
    }
  }, [todos, fetchData])

  const deleteTodo = useCallback(async (id: string) => {
    await api.todos.delete(id)
    await fetchData()
  }, [fetchData])

  const deleteMultiple = useCallback(async (ids: string[]) => {
    await api.todos.deleteBulk(ids)
    await fetchData()
  }, [fetchData])

  return {
    todos,
    categories,
    fetchData,
    addTodo,
    toggleTodo,
    deleteTodo,
    deleteMultiple,
  }
}
