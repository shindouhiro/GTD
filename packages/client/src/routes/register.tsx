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
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-3xl p-8 shadow-2xl">
          <div className="flex items-center justify-center mb-8">
            <div className="p-4 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl">
              <UserPlus className="w-8 h-8 text-white" />
            </div>
          </div>

          <h1 className="text-3xl font-bold text-white text-center mb-2">
            {t('auth.createAccount')}
          </h1>
          <p className="text-white/60 text-center mb-8">
            {t('auth.signUpToOrganize')}
          </p>

          {error && (
            <div className="mb-6 p-4 bg-red-500/20 border border-red-500/50 rounded-xl text-red-200 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-white/80 text-sm font-medium mb-2">
                {t('auth.name')}
              </label>
              <input
                id="register-name-input"
                type="text"
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                className="w-full bg-black/20 border border-white/10 rounded-xl py-3 px-4 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all"
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
                className="w-full bg-black/20 border border-white/10 rounded-xl py-3 px-4 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all"
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
              className="w-full py-3 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl text-white font-medium transition-all shadow-lg hover:scale-105"
            >
              {loading ? t('auth.creatingAccount') : t('auth.signUp')}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-white/60 text-sm">
              {t('auth.alreadyHaveAccount')}
              {' '}
              <Link
                to="/login"
                className="text-purple-400 hover:text-purple-300 font-medium transition-colors"
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
