import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'

import { useTheme } from '../contexts/useTheme'
import { signInWithProvider } from '../lib/oauth'
import { supabase } from '../lib/supabase'

const OAUTH_PROVIDERS = [
  { id: 'google', label: 'Google', icon: 'google' },
  { id: 'apple', label: 'Apple', icon: 'apple' },
  { id: 'github', label: 'GitHub', icon: 'github' },
] as const

const Icons = {
  google: (
    <svg viewBox="0 0 24 24" className="w-5 h-5">
      <path
        fill="currentColor"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="currentColor"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="currentColor"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="currentColor"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  ),
  apple: (
    <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
      <path d="M18.71 18.34c-.25.89-1.21 1.32-1.9.82C12.42 14.92 8.06 13 5.04 14.25c-.37.17-.59-.07-.68-.47-.73-3.17 2.19-7.34 6.33-8.82.2-.07.37-.2.45-.36.86-1.65 3.02-3.18 5.42-3.18 2.66 0 5.05 1.75 5.83 4.07.07.2-.06.43-.36.47-1.6.14-4.04 1.04-6.03 3.98-.14.19-.06.43.16.54 1.97 1.03 4.34 3.12 4.93 5.94.07.32-.18.56-.49.5-1.7-.18-3.35-.86-4.55-2.23zm-2.32-14.13c-.53 2.29-3.34 4.15-6.07 4.05-.17 0-.31-.16-.28-.34.28-1.74 2.36-4.2 5.83-4.04.25.01.4.2.38.41-.02.27-.2.47-.48.39z" />
    </svg>
  ),
  github: (
    <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
      <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
    </svg>
  ),
}

export default function Register() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const nextParam = searchParams.get('next') ?? '/browse'
  const { theme, setTheme } = useTheme()
  const [themeOpen, setThemeOpen] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  const handleOAuth = async (provider: typeof OAUTH_PROVIDERS[number]['id']) => {
    setError('')
    setLoading(true)
    const redirectTo = `${window.location.origin}/auth/callback?type=register&next=${encodeURIComponent(nextParam)}`
    const outcome = await signInWithProvider(provider, redirectTo)
    setLoading(false)
    if (outcome.status === 'error') setError(outcome.message)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (password !== confirmPassword) { setError('Passwords do not match'); return }
    setLoading(true)
    const { data, error } = await supabase.auth.signUp({ email, password })
    setLoading(false)
    if (error) { setError(error.message); return }
    if (data?.user?.identities?.length === 0) {
      setError('An account with this email already exists. Please sign in instead.')
      return
    }
    if (data?.session) {
      navigate(nextParam)
      return
    }
    setSuccess(true)
  }

  return (
    <div className="min-h-screen bg-warm-50 flex items-center justify-center px-4 relative">
      <div className="absolute top-4 right-4">
        <button
          onClick={() => setThemeOpen(o => !o)}
          className="flex items-center gap-1.5 bg-card border border-warm-200 hover:bg-warm-100 text-warm-700 hover:text-crimson px-3 py-1.5 rounded-lg transition text-sm shadow-sm"
        >
          <span className="capitalize hidden sm:inline">{theme}</span>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        {themeOpen && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setThemeOpen(false)} />
            <div className="absolute right-0 top-full mt-1 w-40 bg-card border border-warm-200 rounded-lg shadow-lg z-20 py-1 overflow-hidden">
              {([
                { key: 'light', label: 'Light', icon: (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                ) },
                { key: 'dark', label: 'Dark', icon: (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                  </svg>
                ) },
                { key: 'system', label: 'System', icon: (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                ) },
              ] as const).map(opt => (
                <button
                  key={opt.key}
                  onClick={() => { setTheme(opt.key); setThemeOpen(false) }}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition ${
                    theme === opt.key
                      ? 'text-crimson bg-warm-100 font-medium'
                      : 'text-warm-700 hover:bg-warm-50'
                  }`}
                >
                  <span className="text-base">{opt.icon}</span>
                  <span className="flex-1 text-left">{opt.label}</span>
                  {theme === opt.key && (
                    <svg className="w-4 h-4 text-crimson" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                </button>
              ))}
            </div>
          </>
        )}
      </div>
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-crimson">StreamApp</h1>
          <p className="text-warm-600 mt-2 text-sm">Create your account</p>
        </div>

        <div className="bg-card border border-warm-200 rounded-xl p-6 sm:p-8 shadow-sm space-y-4">
          {error && <div className="text-crimson text-sm bg-red-50 p-3 rounded-lg">{error}</div>}
          {success && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-green-800 font-semibold mb-1">Account created!</h3>
              <p className="text-green-700 text-sm mb-2">
                We've sent a confirmation link to <strong>{email}</strong>.
              </p>
              <p className="text-green-700 text-sm mb-4">
                Please check your email and click the link to verify your account.
              </p>
              <button
                onClick={() => navigate('/login')}
                className="text-sm text-crimson hover:underline font-medium"
              >
                Go to sign in
              </button>
            </div>
          )}

          <div className="space-y-3">
            {OAUTH_PROVIDERS.map(provider => (
              <button
                key={provider.id}
                type="button"
                onClick={() => handleOAuth(provider.id)}
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 bg-card border border-warm-200 hover:bg-warm-50 text-warm-700 hover:text-warm-900 py-2.5 rounded-lg transition disabled:opacity-50"
              >
                <span className="text-warm-600">{Icons[provider.icon]}</span>
                <span>Sign up with {provider.label}</span>
              </button>
            ))}
          </div>

          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-warm-200" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-card text-warm-500">Or continue with email</span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-warm-700 text-sm font-medium mb-1.5">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full bg-card border border-warm-200 text-warm-900 rounded-lg px-4 py-3 text-sm focus:border-crimson focus:ring-1 focus:ring-crimson outline-none placeholder-warm-400 transition"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label className="block text-warm-700 text-sm font-medium mb-1.5">Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full bg-card border border-warm-200 text-warm-900 rounded-lg px-4 py-3 text-sm focus:border-crimson focus:ring-1 focus:ring-crimson outline-none placeholder-warm-400 transition"
                placeholder="\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022"
              />
            </div>

            <div>
              <label className="block text-warm-700 text-sm font-medium mb-1.5">Confirm Password</label>
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                className="w-full bg-card border border-warm-200 text-warm-900 rounded-lg px-4 py-3 text-sm focus:border-crimson focus:ring-1 focus:ring-crimson outline-none placeholder-warm-400 transition"
                placeholder="\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-crimson hover:bg-crimson-hover text-white py-3 rounded-lg font-semibold disabled:opacity-50 transition"
            >
              {loading ? 'Creating account...' : 'Create Account'}
            </button>
          </form>

          <p className="text-center text-warm-500 mt-4 text-sm">
            Already have an account?{' '}
            <button onClick={() => navigate('/login')} className="text-crimson hover:underline font-medium">Sign in</button>
          </p>
        </div>
      </div>
    </div>
  )
}