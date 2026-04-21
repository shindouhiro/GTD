import type { Category, Todo } from '@/api'
import { useCallback, useEffect, useState } from 'react'
import { isWithinInterval } from 'date-fns'
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

  const bulkAdd = useCallback(async (dates: Date[], text: string, categoryId?: string) => {
    const newTodos = dates.map(date => ({
      id: generateUUID(),
      text,
      completed: false,
      date,
      categoryId,
    }))
    await api.todos.bulkAdd(newTodos)
    await fetchData()
  }, [fetchData])

  const bulkDelete = useCallback(async (text: string, startDate: Date, endDate: Date) => {
    const idsToDelete = todos
      .filter(t => 
        t.text === text && 
        isWithinInterval(new Date(t.date), { start: startDate, end: endDate })
      )
      .map(t => t.id)
    
    if (idsToDelete.length > 0) {
      await api.todos.deleteBulk(idsToDelete)
      await fetchData()
    }
  }, [todos, fetchData])

  return {
    todos,
    categories,
    fetchData,
    addTodo,
    bulkAdd,
    bulkDelete,
    toggleTodo,
    deleteTodo,
    deleteMultiple,
  }
}
