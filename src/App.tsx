import type { User } from '@supabase/supabase-js'
import { QueryClientProvider } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'

import ErrorBoundary from './components/ErrorBoundary'
import { ThemeProvider } from './contexts/ThemeContext'
import { validateEnv } from './lib/env'
import { queryClient } from './lib/query-client'
import { supabase } from './lib/supabase'
import Browse from './pages/Browse'
import Downloads from './pages/Downloads'
import Login from './pages/Login'
import Register from './pages/Register'
import Requests from './pages/Requests'
import Watch from './pages/Watch'

function AppContent() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [envError, setEnvError] = useState<string | null>(null)

  useEffect(() => {
    const env = validateEnv()
    if (!env.valid) {
      setEnvError(env.missing.join(', '))
      setLoading(false)
      return
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen bg-warm-50 flex items-center justify-center">
        <div className="text-center animate-pulse">
          <h1 className="text-4xl font-bold text-crimson mb-3">StreamApp</h1>
          <div className="w-32 h-1.5 bg-warm-200 rounded-full mx-auto" />
        </div>
      </div>
    )
  }

  if (envError) {
    return (
      <div className="min-h-screen bg-warm-50 flex items-center justify-center px-6">
        <div className="bg-white border border-crimson/30 rounded-xl p-8 max-w-lg text-center shadow-lg">
          <h1 className="text-2xl font-bold text-crimson mb-4">Configuration Error</h1>
          <p className="text-warm-700 mb-2">Missing or invalid environment variables:</p>
          <p className="text-crimson text-sm font-mono mb-4">{envError}</p>
          <p className="text-warm-500 text-xs">Please check your .env file or Vercel environment variables.</p>
        </div>
      </div>
    )
  }

  return (
    <ErrorBoundary>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Navigate to={user ? '/browse' : '/login'} replace />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route
            path="/browse"
            element={user ? <Browse user={user} /> : <Navigate to="/login" replace />}
          />
          <Route
            path="/watch/:id"
            element={user ? <Watch user={user} /> : <Navigate to="/login" replace />}
          />
          <Route
            path="/watch/:type/:id"
            element={user ? <Watch user={user} /> : <Navigate to="/login" replace />}
          />
          <Route
            path="/downloads"
            element={user ? <Downloads user={user} /> : <Navigate to="/login" replace />}
          />
          <Route
            path="/requests"
            element={user ? <Requests user={user} /> : <Navigate to="/login" replace />}
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </ErrorBoundary>
  )
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AppContent />
      </ThemeProvider>
    </QueryClientProvider>
  )
}
