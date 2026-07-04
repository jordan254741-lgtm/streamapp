import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { supabase } from '../lib/supabase'

export default function Register() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (password !== confirmPassword) { setError('Passwords do not match'); return }
    setLoading(true)
    const { error } = await supabase.auth.signUp({ email, password })
    setLoading(false)
    if (error) { setError(error.message); return }
    setSuccess(true)
    setTimeout(() => navigate('/login'), 2000)
  }

  return (
    <div className="min-h-screen bg-warm-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-crimson">StreamApp</h1>
          <p className="text-warm-600 mt-2 text-sm">Create your account</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white border border-warm-200 rounded-xl p-6 sm:p-8 shadow-sm space-y-4">
          {error && <div className="text-crimson text-sm bg-red-50 p-3 rounded-lg">{error}</div>}
          {success && <div className="text-green-700 text-sm bg-green-50 p-3 rounded-lg">Account created! Redirecting...</div>}

          <div>
            <label className="block text-warm-700 text-sm font-medium mb-1.5">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full bg-white border border-warm-200 text-warm-900 rounded-lg px-4 py-3 text-sm focus:border-crimson focus:ring-1 focus:ring-crimson outline-none placeholder-warm-400 transition"
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
              className="w-full bg-white border border-warm-200 text-warm-900 rounded-lg px-4 py-3 text-sm focus:border-crimson focus:ring-1 focus:ring-crimson outline-none placeholder-warm-400 transition"
              placeholder="••••••••"
            />
          </div>

          <div>
            <label className="block text-warm-700 text-sm font-medium mb-1.5">Confirm Password</label>
            <input
              type="password"
              required
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              className="w-full bg-white border border-warm-200 text-warm-900 rounded-lg px-4 py-3 text-sm focus:border-crimson focus:ring-1 focus:ring-crimson outline-none placeholder-warm-400 transition"
              placeholder="••••••••"
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
  )
}
