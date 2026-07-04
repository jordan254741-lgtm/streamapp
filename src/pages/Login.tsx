import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { useTheme } from '../contexts/ThemeContext'
import { supabase } from '../lib/supabase'

export default function Login() {
  const navigate = useNavigate()
  const { theme, setTheme } = useTheme()
  const [themeOpen, setThemeOpen] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)
    if (error) { setError(error.message); return }
    navigate('/browse')
  }

  return (
    <div className="min-h-screen bg-warm-50 flex items-center justify-center px-4 relative">
      <div className="absolute top-4 right-4">
        <button
          onClick={() => setThemeOpen(o => !o)}
          className="flex items-center gap-1.5 bg-card border border-warm-200 hover:bg-warm-100 text-warm-700 hover:text-crimson px-3 py-1.5 rounded-lg transition text-sm shadow-sm"
        >
          {theme === 'dark' ? '🌙' : theme === 'light' ? '☀️' : '💻'}
          <span className="capitalize hidden sm:inline">{theme}</span>
        </button>
        {themeOpen && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setThemeOpen(false)} />
            <div className="absolute right-0 top-full mt-1 w-40 bg-card border border-warm-200 rounded-lg shadow-lg z-20 py-1 overflow-hidden">
              {([
                { key: 'light', label: 'Light', icon: '☀️' },
                { key: 'dark', label: 'Dark', icon: '🌙' },
                { key: 'system', label: 'System', icon: '💻' },
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
          <p className="text-warm-600 mt-2 text-sm">Sign in to your account</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-card border border-warm-200 rounded-xl p-6 sm:p-8 shadow-sm space-y-4">
          {error && <div className="text-crimson text-sm bg-red-50 p-3 rounded-lg">{error}</div>}

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
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-crimson hover:bg-crimson-hover text-white py-3 rounded-lg font-semibold disabled:opacity-50 transition"
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <p className="text-center text-warm-500 mt-4 text-sm">
          Don't have an account?{' '}
          <button onClick={() => navigate('/register')} className="text-crimson hover:underline font-medium">Create one</button>
        </p>
      </div>
    </div>
  )
}
