import { Link, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { authApi, isDesktopMode } from '@/lib/auth'

export function AppHeader() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const desktopMode = isDesktopMode()

  const handleLogout = async () => {
    if (isLoggingOut)
      return

    setIsLoggingOut(true)
    authApi.logout()

    try {
      await navigate({ to: '/login', replace: true })
    }
    catch {
      window.location.replace('/login')
    }
    finally {
      setIsLoggingOut(false)
    }
  }

  return (
    <header className="mb-8 text-center md:mb-12">
      <div className="mb-6 flex flex-col items-center justify-center gap-4 md:mb-8 md:gap-6">
        <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl md:text-5xl">
          {t('home.title')}
        </h1>
        <div className="grid w-full grid-cols-2 gap-2.5 sm:flex sm:w-auto sm:flex-wrap sm:justify-center sm:gap-3">
          <Link
            id="app-header-statistics-link"
            to="/statistics"
            className="group flex min-h-11 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-theme-primary to-theme-accent px-3 py-2 text-xs font-medium text-white shadow-lg transition-all hover:opacity-90 hover:scale-105 sm:px-4 sm:text-sm md:text-base"
          >
            <svg
              className="h-4 w-4 sm:h-5 sm:w-5"
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
            id="app-header-categories-link"
            to="/categories"
            className="group flex min-h-11 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-theme-accent to-theme-primary px-3 py-2 text-xs font-medium text-white shadow-lg transition-all hover:opacity-90 hover:scale-105 sm:px-4 sm:text-sm md:text-base"
          >
            <svg
              className="h-4 w-4 sm:h-5 sm:w-5"
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
          <Link
            id="app-header-settings-link"
            to="/settings"
            className="group flex min-h-11 items-center justify-center gap-2 rounded-xl bg-white/10 px-3 py-2 text-xs font-medium text-white backdrop-blur-sm border border-white/20 transition-all hover:bg-white/20 hover:scale-105 sm:px-4 sm:text-sm md:text-base"
          >
            <svg
              className="h-4 w-4 sm:h-5 sm:w-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
            {t('navigation.settings')}
          </Link>
          {!desktopMode && (
            <button
              id="app-header-logout-button"
              type="button"
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="group flex min-h-11 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-red-500 to-pink-500 px-3 py-2 text-xs font-medium text-white shadow-lg transition-all hover:opacity-90 hover:scale-105 disabled:cursor-not-allowed disabled:opacity-60 sm:px-4 sm:text-sm md:text-base"
            >
              <svg
                className="h-4 w-4 sm:h-5 sm:w-5"
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
          )}
        </div>
      </div>
      <p className="px-2 text-sm text-white/60 sm:text-base md:text-lg">{t('home.subtitle')}</p>
    </header>
  )
}
