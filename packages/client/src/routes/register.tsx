import type { RegisterRequest } from '@/lib/auth'
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { UserPlus } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { authApi } from '@/lib/auth'

export const Route = createFileRoute('/register')({
  component: RegisterPage,
})

function RegisterPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [formData, setFormData] = useState<RegisterRequest>({
    email: '',
    password: '',
    name: '',
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (formData.password.length < 6) {
      setError(t('auth.passwordMinLength'))
      return
    }

    setLoading(true)

    try {
      await authApi.register(formData)
      navigate({ to: '/' })
    }
    catch (err) {
      setError(err instanceof Error ? err.message : t('auth.registrationFailed'))
    }
    finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-theme-start via-theme-mid to-theme-end px-4 py-6 sm:py-8">
      <div className="w-full max-w-md">
        <div className="rounded-3xl border border-white/20 bg-white/10 p-5 shadow-2xl backdrop-blur-lg sm:p-8">
          <div className="mb-6 flex items-center justify-center sm:mb-8">
            <div className="rounded-2xl bg-gradient-to-br from-theme-accent to-theme-primary p-3 sm:p-4 shadow-lg">
              <UserPlus className="h-7 w-7 text-white sm:h-8 sm:w-8" />
            </div>
          </div>

          <h1 className="mb-2 text-center text-2xl font-bold text-white sm:text-3xl">
            {t('auth.createAccount')}
          </h1>
          <p className="mb-6 text-center text-sm text-white/60 sm:mb-8 sm:text-base">
            {t('auth.signUpToOrganize')}
          </p>

          {error && (
            <div className="mb-6 p-4 bg-red-500/20 border border-red-500/50 rounded-xl text-red-200 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5 sm:space-y-6">
            <div>
              <label className="block text-white/80 text-sm font-medium mb-2">
                {t('auth.name')}
              </label>
              <input
                id="register-name-input"
                type="text"
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                className="w-full bg-black/20 border border-white/10 rounded-xl py-3 px-4 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-theme-accent transition-all"
                placeholder={t('auth.namePlaceholder')}
                required
                autoFocus
              />
            </div>

            <div>
              <label className="block text-white/80 text-sm font-medium mb-2">
                {t('auth.email')}
              </label>
              <input
                id="register-email-input"
                type="email"
                value={formData.email}
                onChange={e => setFormData({ ...formData, email: e.target.value })}
                className="w-full bg-black/20 border border-white/10 rounded-xl py-3 px-4 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all"
                placeholder={t('auth.emailPlaceholder')}
                required
              />
            </div>

            <div>
              <label className="block text-white/80 text-sm font-medium mb-2">
                {t('auth.password')}
              </label>
              <input
                id="register-password-input"
                type="password"
                value={formData.password}
                onChange={e => setFormData({ ...formData, password: e.target.value })}
                className="w-full bg-black/20 border border-white/10 rounded-xl py-3 px-4 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-theme-accent transition-all"
                placeholder={t('auth.passwordPlaceholder')}
                required
                minLength={6}
              />
              <p className="mt-2 text-white/40 text-xs">
                {t('auth.passwordMinLength')}
              </p>
            </div>

            <button
              id="register-submit-button"
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-gradient-to-r from-theme-accent to-theme-primary hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl text-white font-medium transition-all shadow-lg hover:scale-105"
            >
              {loading ? t('auth.creatingAccount') : t('auth.signUp')}
            </button>
          </form>

          <div className="mt-5 text-center sm:mt-6">
            <p className="text-white/60 text-sm">
              {t('auth.alreadyHaveAccount')}
              {' '}
              <Link
                id="register-to-login-link"
                to="/login"
                className="text-theme-accent hover:opacity-80 font-medium transition-colors"
              >
                {t('auth.signIn')}
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
