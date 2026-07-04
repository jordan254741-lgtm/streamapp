import { useCallback,useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { supabase } from '../lib/supabase'

export function useAuth() {
  const navigate = useNavigate()
  const [isSigningOut, setIsSigningOut] = useState(false)

  const signOut = useCallback(async () => {
    if (isSigningOut) return
    setIsSigningOut(true)
    try {
      await supabase.auth.signOut()
      navigate('/login')
    } finally {
      setIsSigningOut(false)
    }
  }, [isSigningOut, navigate])

  return { signOut, isSigningOut } as const
}
