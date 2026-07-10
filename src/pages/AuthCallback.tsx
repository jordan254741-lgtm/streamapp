import { useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'

import { supabase } from '../lib/supabase'

export default function AuthCallback() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  useEffect(() => {
    const code = searchParams.get('code')
    const next = searchParams.get('next') ?? '/browse'

    if (code) {
      supabase.auth.exchangeCodeForSession(code).then(() => {
        navigate(next, { replace: true })
      })
    } else {
      navigate(next, { replace: true })
    }
  }, [searchParams, navigate])

  return (
    <div className="min-h-screen bg-warm-50 flex items-center justify-center px-4">
      <div className="text-center animate-pulse">
        <div className="w-12 h-12 border-4 border-crimson/30 border-t-crimson rounded-full mx-auto mb-4" />
        <p className="text-warm-600">Completing sign in...</p>
      </div>
    </div>
  )
}