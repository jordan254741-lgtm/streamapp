import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'

import { supabase } from '../lib/supabase'

export default function AuthCallback() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  const authType = searchParams.get('type') ?? 'login'
  const isRegister = authType === 'register'
  const loadingTitle = isRegister ? 'Creating your account...' : 'Completing authentication...'
  const loadingDesc = isRegister
    ? 'Please wait while we set up your new account'
    : 'Please wait while we sign you in'
  const successTitle = isRegister ? 'Account created!' : 'Signed in successfully!'
  const successDesc = isRegister
    ? 'Welcome aboard! Redirecting to browse...'
    : 'Redirecting to your destination...'

  useEffect(() => {
    const code = searchParams.get('code')
    const next = searchParams.get('next') ?? '/browse'
    const oauthError = searchParams.get('error_description') ?? searchParams.get('error')
    let cancelled = false

    if (code) {
      setIsLoading(true)
      supabase.auth.exchangeCodeForSession(code)
        .then(({ error: exchangeError }) => {
          if (cancelled) return
          setIsLoading(false)
          if (exchangeError) {
            setError(exchangeError.message)
          } else {
            setSuccess(true)
            setTimeout(() => {
              if (!cancelled) navigate(next, { replace: true })
            }, 1500)
          }
        })
        .catch(err => {
          if (cancelled) return
          setIsLoading(false)
          setError(err instanceof Error ? err.message : 'Authentication failed')
        })
    } else if (oauthError) {
      setError(oauthError)
    } else {
      navigate(next, { replace: true })
    }

    return () => { cancelled = true }
  }, [searchParams, navigate])

  return (
    <div className="min-h-screen bg-warm-50 flex items-center justify-center px-4">
      {error ? (
        <div className="bg-card border border-crimson/30 rounded-xl p-8 max-w-lg text-center shadow-lg">
          <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-7 h-7 text-crimson" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-crimson mb-2">Authentication Error</h1>
          <p className="text-warm-700 mb-4">{error}</p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => navigate(isRegister ? '/register' : '/login', { replace: true })}
              className="px-6 py-2 bg-crimson text-white rounded-lg font-semibold hover:bg-crimson-hover transition"
            >
              Try Again
            </button>
            <button
              onClick={() => navigate('/login', { replace: true })}
              className="px-6 py-2 bg-warm-100 text-warm-700 rounded-lg font-semibold hover:bg-warm-200 transition"
            >
              Go to Login
            </button>
          </div>
        </div>
      ) : success ? (
        <div className="text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-warm-900 mb-1">{successTitle}</h2>
          <p className="text-warm-500 text-sm">{successDesc}</p>
        </div>
      ) : isLoading ? (
        <div className="text-center">
          <div className="w-16 h-16 border-6 border-crimson/30 border-t-crimson rounded-full mx-auto mb-6 animate-spin" />
          <p className="text-warm-600 text-lg mb-2">{loadingTitle}</p>
          <p className="text-warm-500 text-sm">{loadingDesc}</p>
        </div>
      ) : (
        <div className="text-center animate-pulse">
          <div className="w-12 h-12 border-4 border-crimson/30 border-t-crimson rounded-full mx-auto mb-4" />
          <p className="text-warm-600">{loadingTitle}</p>
        </div>
      )}
    </div>
  )
}