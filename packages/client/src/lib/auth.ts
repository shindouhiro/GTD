export interface User {
  id: string
  email: string
  name: string
  createdAt: string
}

export interface LoginRequest {
  email: string
  password: string
}

export interface RegisterRequest {
  email: string
  password: string
  name: string
}

export interface AuthResponse {
  user: User
  token: string
}

const TOKEN_KEY = 'auth_token'
const USER_KEY = 'auth_user'
const REQUEST_TIMEOUT_MS = 10000

declare global {
  interface Window {
    __GTD_DESKTOP__?: boolean
    __TAURI_API_URL__?: string
  }
}

export function isDesktopMode(): boolean {
  return Boolean(window.__GTD_DESKTOP__ || window.__TAURI_API_URL__)
}

export function getApiBaseUrl(): string {
  return window.__TAURI_API_URL__ || import.meta.env.VITE_API_URL || '/api'
}

async function fetchWithTimeout(input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

  try {
    return await fetch(input, {
      ...init,
      signal: controller.signal,
    })
  }
  catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError')
      throw new Error('请求超时，请确认桌面后端已启动后重试')
    throw error
  }
  finally {
    clearTimeout(timer)
  }
}

// Token management
export const tokenManager = {
  getToken: (): string | null => {
    return localStorage.getItem(TOKEN_KEY)
  },

  setToken: (token: string): void => {
    localStorage.setItem(TOKEN_KEY, token)
  },

  removeToken: (): void => {
    localStorage.removeItem(TOKEN_KEY)
  },

  getAuthHeaders: (): HeadersInit => {
    const token = tokenManager.getToken()
    return token ? { Authorization: `Bearer ${token}` } : {}
  },
}

// User management
export const userManager = {
  getUser: (): User | null => {
    const userJson = localStorage.getItem(USER_KEY)
    if (!userJson && isDesktopMode()) {
      return {
        id: 'demo-user',
        email: 'local@gtd.desktop',
        name: '本地用户',
        createdAt: '',
      }
    }
    if (!userJson)
      return null

    try {
      return JSON.parse(userJson)
    }
    catch {
      return null
    }
  },

  setUser: (user: User): void => {
    localStorage.setItem(USER_KEY, JSON.stringify(user))
  },

  removeUser: (): void => {
    localStorage.removeItem(USER_KEY)
  },
}

// Auth API
export const authApi = {
  register: async (data: RegisterRequest): Promise<AuthResponse> => {
    const res = await fetchWithTimeout(`${getApiBaseUrl()}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })

    if (!res.ok) {
      try {
        const error = await res.json()
        throw new Error(error.error || 'Registration failed')
      }
      catch (e) {
        // If response is not JSON or empty, throw a generic error
        if (e instanceof SyntaxError) {
          throw new TypeError(`Registration failed with status ${res.status}`)
        }
        throw e
      }
    }

    const authData: AuthResponse = await res.json()
    tokenManager.setToken(authData.token)
    userManager.setUser(authData.user)
    return authData
  },

  login: async (data: LoginRequest): Promise<AuthResponse> => {
    const res = await fetchWithTimeout(`${getApiBaseUrl()}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })

    if (!res.ok) {
      try {
        const error = await res.json()
        throw new Error(error.error || 'Login failed')
      }
      catch (e) {
        // If response is not JSON or empty, throw a generic error
        if (e instanceof SyntaxError) {
          throw new TypeError(`Login failed with status ${res.status}`)
        }
        throw e
      }
    }

    const authData: AuthResponse = await res.json()
    tokenManager.setToken(authData.token)
    userManager.setUser(authData.user)
    return authData
  },

  logout: (): void => {
    if (isDesktopMode())
      return

    tokenManager.removeToken()
    userManager.removeUser()
  },

  getCurrentUser: async (): Promise<User> => {
    const res = await fetchWithTimeout(`${getApiBaseUrl()}/auth/me`, {
      headers: {
        ...tokenManager.getAuthHeaders(),
      },
    })

    if (!res.ok) {
      throw new Error('Failed to get current user')
    }

    const user = await res.json()
    userManager.setUser(user)
    return user
  },

  getUser: (): User | null => {
    return userManager.getUser()
  },

  setUser: (user: User): void => {
    userManager.setUser(user)
  },

  isAuthenticated: (): boolean => {
    if (isDesktopMode())
      return true

    return tokenManager.getToken() !== null
  },
}
