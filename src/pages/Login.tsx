import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { useTheme } from '../contexts/ThemeContext'
import { supabase } from '../lib/supabase'

export default function Login() {
  const navigate = useNavigate()
  const { theme, toggle } = useTheme()
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
      <button
        onClick={toggle}
        className="absolute top-4 right-4 flex items-center gap-1.5 bg-card border border-warm-200 hover:bg-warm-100 text-warm-700 hover:text-crimson px-3 py-1.5 rounded-lg transition text-sm shadow-sm"
      >
        {theme === 'dark' ? '🌙' : theme === 'light' ? '☀️' : '💻'}
        <span className="capitalize hidden sm:inline">{theme}</span>
      </button>
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
