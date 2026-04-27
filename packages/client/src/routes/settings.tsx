import { createFileRoute, Link, redirect } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { api } from '@/api'
import { authApi } from '@/lib/auth'

export const Route = createFileRoute('/settings')({
  beforeLoad: async () => {
    if (!authApi.isAuthenticated()) {
      throw redirect({ to: '/login' })
    }
  },
  component: SettingsPage,
})

function SettingsPage() {
  const { t } = useTranslation()
  const [user, setUser] = useState<{ name: string; email: string } | null>(null)
  const [profileName, setProfileName] = useState('')
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    const userData = authApi.getUser()
    if (userData) {
      setUser(userData)
      setProfileName(userData.name)
    }
  }, [])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setMessage(null)

    try {
      // 1. Update Profile if name changed
      if (profileName !== user?.name) {
        const updatedUser = await api.auth.updateProfile({ name: profileName })
        authApi.setUser(updatedUser)
        setUser(updatedUser)
      }

      // 2. Update Password if fields are filled
      if (currentPassword || newPassword || confirmPassword) {
        if (newPassword !== confirmPassword) {
          throw new Error(t('settings.passwords_dont_match'))
        }
        if (!currentPassword) {
          throw new Error(t('settings.current_password_required'))
        }
        await api.auth.updatePassword({ currentPassword, newPassword })
        setCurrentPassword('')
        setNewPassword('')
        setConfirmPassword('')
      }

      setMessage({ type: 'success', text: t('settings.all_saved') })
    }
    catch (err: any) {
      setMessage({ type: 'error', text: err.message })
    }
    finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 px-4 py-6 md:py-10 lg:py-12">
      <div className="mx-auto max-w-2xl">
        <div className="mb-8 flex items-center gap-3 md:mb-12 md:gap-4">
          <Link
            id="settings-back-to-home-link"
            to="/"
            className="p-2 bg-white/10 hover:bg-white/20 rounded-xl text-white transition-all border border-white/10"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">{t('settings.title')}</h1>
        </div>

        {message && (
          <div className={`mb-8 p-4 rounded-2xl border ${
            message.type === 'success'
              ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-200'
              : 'bg-rose-500/20 border-rose-500/50 text-rose-200'
          } backdrop-blur-xl animate-in fade-in slide-in-from-top-4 duration-300`}>
            {message.text}
          </div>
        )}

        <div className="relative group">
          <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/20 via-purple-500/20 to-pink-500/20 rounded-3xl blur-2xl transition-all duration-700 opacity-50 group-hover:opacity-100" />
          <div className="relative rounded-3xl border border-white/10 bg-white/5 p-5 shadow-2xl backdrop-blur-2xl sm:p-6 lg:p-10">
            <form onSubmit={handleSave} className="space-y-10">
              {/* Profile Section */}
              <div className="space-y-6">
                <h2 className="text-xl font-bold text-white flex items-center gap-3">
                  <span className="w-1.5 h-6 bg-indigo-500 rounded-full" />
                  {t('settings.profile_info')}
                </h2>
                <div className="grid grid-cols-1 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-white/60 mb-2">{t('settings.email')}</label>
                    <input
                      type="email"
                      value={user?.email || ''}
                      disabled
                      className="w-full bg-white/5 border border-white/5 rounded-xl px-4 py-3 text-white/40 cursor-not-allowed outline-none"
                    />
                    <p className="mt-2 text-xs text-white/30">{t('settings.email_readonly')}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-white/60 mb-2">{t('settings.name')}</label>
                    <input
                      type="text"
                      value={profileName}
                      onChange={e => setProfileName(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all"
                      placeholder={t('settings.name_placeholder')}
                    />
                  </div>
                </div>
              </div>

              {/* Password Section */}
              <div className="space-y-6 pt-6 border-t border-white/10">
                <h2 className="text-xl font-bold text-white flex items-center gap-3">
                  <span className="w-1.5 h-6 bg-purple-500 rounded-full" />
                  {t('settings.change_password')}
                </h2>
                <div className="grid grid-cols-1 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-white/60 mb-2">{t('settings.current_password')}</label>
                    <input
                      type="password"
                      value={currentPassword}
                      onChange={e => setCurrentPassword(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all"
                      placeholder={t('settings.current_password_placeholder')}
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-white/60 mb-2">{t('settings.new_password')}</label>
                      <input
                        type="password"
                        value={newPassword}
                        onChange={e => setNewPassword(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all"
                        placeholder={t('settings.new_password_placeholder')}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-white/60 mb-2">{t('settings.confirm_new_password')}</label>
                      <input
                        type="password"
                        value={confirmPassword}
                        onChange={e => setConfirmPassword(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all"
                        placeholder={t('settings.confirm_new_password_placeholder')}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-6">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-4 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 hover:from-indigo-600 hover:via-purple-600 hover:to-pink-600 rounded-2xl text-white font-bold text-lg transition-all hover:scale-[1.02] shadow-xl disabled:opacity-50 disabled:hover:scale-100 flex items-center justify-center gap-3"
                >
                  {isLoading && (
                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  )}
                  {t('settings.save_all')}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
