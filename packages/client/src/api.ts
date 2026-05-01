import { getApiBaseUrl, isDesktopMode, tokenManager } from './lib/auth'

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

function getHeaders(): HeadersInit {
  return {
    'Content-Type': 'application/json',
    ...tokenManager.getAuthHeaders(),
  }
}

function apiUrl(path: string): string {
  return `${getApiBaseUrl()}${path}`
}

async function handleApiError(res: Response, defaultMessage: string): Promise<never> {
  if (res.status === 401 && !isDesktopMode()) {
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
      const res = await fetch(apiUrl('/categories'), {
        headers: tokenManager.getAuthHeaders(),
      })
      if (!res.ok)
        await handleApiError(res, 'Failed to fetch categories')
      return res.json()
    },
    add: async (category: Category): Promise<void> => {
      const res = await fetch(apiUrl('/categories'), {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(category),
      })
      if (!res.ok)
        await handleApiError(res, 'Failed to add category')
    },
    update: async (id: string, updates: Partial<Category>): Promise<void> => {
      const res = await fetch(apiUrl(`/categories/${id}`), {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify(updates),
      })
      if (!res.ok)
        await handleApiError(res, 'Failed to update category')
    },
    delete: async (id: string): Promise<void> => {
      const res = await fetch(apiUrl(`/categories/${id}`), {
        method: 'DELETE',
        headers: tokenManager.getAuthHeaders(),
      })
      if (!res.ok)
        await handleApiError(res, 'Failed to delete category')
    },
  },
  todos: {
    getAll: async (): Promise<Todo[]> => {
      const res = await fetch(apiUrl('/todos'), {
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
      const res = await fetch(apiUrl('/todos'), {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(todo),
      })
      if (!res.ok)
        await handleApiError(res, 'Failed to add todo')
    },
    update: async (id: string, updates: Partial<Todo>): Promise<void> => {
      const res = await fetch(apiUrl(`/todos/${id}`), {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify(updates),
      })
      if (!res.ok)
        await handleApiError(res, 'Failed to update todo')
    },
    delete: async (id: string): Promise<void> => {
      const res = await fetch(apiUrl(`/todos/${id}`), {
        method: 'DELETE',
        headers: tokenManager.getAuthHeaders(),
      })
      if (!res.ok)
        await handleApiError(res, 'Failed to delete todo')
    },
    clear: async (): Promise<void> => {
      const res = await fetch(apiUrl('/todos'), {
        method: 'DELETE',
        headers: tokenManager.getAuthHeaders(),
      })
      if (!res.ok)
        await handleApiError(res, 'Failed to clear todos')
    },
    deleteBulk: async (ids: string[]): Promise<void> => {
      const res = await fetch(apiUrl('/todos/bulk'), {
        method: 'DELETE',
        headers: getHeaders(),
        body: JSON.stringify({ ids }),
      })
      if (!res.ok)
        await handleApiError(res, 'Failed to delete selected todos')
    },
    bulkAdd: async (todos: Todo[]): Promise<void> => {
      const res = await fetch(apiUrl('/todos/bulk'), {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(todos),
      })
      if (!res.ok)
        await handleApiError(res, 'Failed to bulk add todos')
    },
  },
  auth: {
    updateProfile: async (updates: { name?: string, email?: string }): Promise<any> => {
      const res = await fetch(apiUrl('/auth/profile'), {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify(updates),
      })
      if (!res.ok)
        await handleApiError(res, 'Failed to update profile')
      return res.json()
    },
    updatePassword: async (passwords: { currentPassword: string, newPassword: string }): Promise<void> => {
      const res = await fetch(apiUrl('/auth/password'), {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify(passwords),
      })
      if (!res.ok)
        await handleApiError(res, 'Failed to update password')
    },
  },
}
