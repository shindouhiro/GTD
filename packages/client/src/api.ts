import { tokenManager } from './lib/auth'

export interface Category {
  id: string
  name: string
  icon: string
  color: string
}

export interface Todo {
  id: string
  text: string
  completed: boolean
  date: Date // Frontend uses Date object
  categoryId?: string
}

const API_URL = import.meta.env.VITE_API_URL || '/api'

function getHeaders(): HeadersInit {
  return {
    'Content-Type': 'application/json',
    ...tokenManager.getAuthHeaders(),
  }
}

async function handleApiError(res: Response, defaultMessage: string): Promise<never> {
  if (res.status === 401) {
    tokenManager.removeToken()
    // Use window.location for a hard redirect if not using router navigation here
    window.location.href = '/login'
    throw new Error('Session expired. Please login again.')
  }
  
  try {
    const error = await res.json()
    throw new Error(error.error || defaultMessage)
  }
  catch (e) {
    if (e instanceof SyntaxError) {
      throw new TypeError(`${defaultMessage} (Status: ${res.status})`)
    }
    throw e
  }
}

export const api = {
  categories: {
    getAll: async (): Promise<Category[]> => {
      const res = await fetch(`${API_URL}/categories`, {
        headers: tokenManager.getAuthHeaders(),
      })
      if (!res.ok)
        await handleApiError(res, 'Failed to fetch categories')
      return res.json()
    },
    add: async (category: Category): Promise<void> => {
      const res = await fetch(`${API_URL}/categories`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(category),
      })
      if (!res.ok)
        await handleApiError(res, 'Failed to add category')
    },
    update: async (id: string, updates: Partial<Category>): Promise<void> => {
      const res = await fetch(`${API_URL}/categories/${id}`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify(updates),
      })
      if (!res.ok)
        await handleApiError(res, 'Failed to update category')
    },
    delete: async (id: string): Promise<void> => {
      const res = await fetch(`${API_URL}/categories/${id}`, {
        method: 'DELETE',
        headers: tokenManager.getAuthHeaders(),
      })
      if (!res.ok)
        await handleApiError(res, 'Failed to delete category')
    },
  },
  todos: {
    getAll: async (): Promise<Todo[]> => {
      const res = await fetch(`${API_URL}/todos`, {
        headers: tokenManager.getAuthHeaders(),
      })
      if (!res.ok)
        await handleApiError(res, 'Failed to fetch todos')
      const data = await res.json()
      // Convert date string to Date object
      return data.map((todo: any) => ({
        ...todo,
        date: new Date(todo.date),
      }))
    },
    add: async (todo: Todo): Promise<void> => {
      const res = await fetch(`${API_URL}/todos`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(todo),
      })
      if (!res.ok)
        await handleApiError(res, 'Failed to add todo')
    },
    update: async (id: string, updates: Partial<Todo>): Promise<void> => {
      const res = await fetch(`${API_URL}/todos/${id}`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify(updates),
      })
      if (!res.ok)
        await handleApiError(res, 'Failed to update todo')
    },
    delete: async (id: string): Promise<void> => {
      const res = await fetch(`${API_URL}/todos/${id}`, {
        method: 'DELETE',
        headers: tokenManager.getAuthHeaders(),
      })
      if (!res.ok)
        await handleApiError(res, 'Failed to delete todo')
    },
    clear: async (): Promise<void> => {
      const res = await fetch(`${API_URL}/todos`, {
        method: 'DELETE',
        headers: tokenManager.getAuthHeaders(),
      })
      if (!res.ok)
        await handleApiError(res, 'Failed to clear todos')
    },
    deleteBulk: async (ids: string[]): Promise<void> => {
      const res = await fetch(`${API_URL}/todos/bulk`, {
        method: 'DELETE',
        headers: getHeaders(),
        body: JSON.stringify({ ids }),
      })
      if (!res.ok)
        await handleApiError(res, 'Failed to delete selected todos')
    },
    bulkAdd: async (todos: Todo[]): Promise<void> => {
      const res = await fetch(`${API_URL}/todos/bulk`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(todos),
      })
      if (!res.ok)
        await handleApiError(res, 'Failed to bulk add todos')
    },
  },
}
