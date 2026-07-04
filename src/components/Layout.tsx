import type { User } from '@supabase/supabase-js'
import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

import { useAuth } from '../hooks/useAuth'
import { useTheme } from '../contexts/ThemeContext'

interface LayoutProps {
  user: User
  children: React.ReactNode
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '7xl' | 'full'
  showBack?: boolean
  backTo?: string
  backLabel?: string
}

const maxWidthClasses: Record<string, string> = {
  sm: 'max-w-screen-sm',
  md: 'max-w-screen-md',
  lg: 'max-w-screen-lg',
  xl: 'max-w-screen-xl',
  '2xl': 'max-w-screen-2xl',
  '3xl': 'max-w-screen-3xl',
  '7xl': 'max-w-7xl',
  full: 'max-w-full',
}

export default function Layout({ user, children, maxWidth = '7xl', showBack, backTo, backLabel }: LayoutProps) {
  const navigate = useNavigate()
  const location = useLocation()
  const { signOut, isSigningOut } = useAuth()
  const { theme, toggle } = useTheme()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const navItems = [
    { label: 'Browse', path: '/browse' },
    { label: 'Requests', path: '/requests' },
    { label: 'Downloads', path: '/downloads' },
  ]

  const mw = maxWidthClasses[maxWidth] || 'max-w-7xl'

  return (
    <div className="min-h-screen bg-warm-50 text-warm-900">
      <nav className="bg-card backdrop-blur-sm border-b border-warm-200 sticky top-0 z-50">
        <div className="max-w-screen-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14 sm:h-16">
            <div className="flex items-center gap-2 sm:gap-8">
              {showBack && (
                <button
                  onClick={() => navigate(backTo || '/browse')}
                  className="text-warm-600 hover:text-crimson text-sm flex items-center gap-1 mr-2 transition"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  {backLabel || 'Back'}
                </button>
              )}
              <h1
                onClick={() => navigate('/browse')}
                className="text-lg sm:text-xl font-bold text-crimson cursor-pointer select-none"
              >
                StreamApp
              </h1>
              <div className="hidden md:flex items-center gap-1">
                {navItems.map(item => {
                  const isActive = location.pathname === item.path || location.pathname.startsWith(item.path + '/')
                  return (
                    <button
                      key={item.path}
                      onClick={() => navigate(item.path)}
                      className={`px-3 py-2 text-sm rounded-lg transition ${
                        isActive
                          ? 'text-crimson bg-warm-100 font-medium'
                          : 'text-warm-600 hover:text-crimson hover:bg-warm-100'
                      }`}
                    >
                      {item.label}
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="hidden md:flex items-center gap-2">
              <span className="text-warm-500 text-sm truncate max-w-[180px] xl:max-w-[240px]">{user.email}</span>
              <button
                onClick={toggle}
                className="flex items-center gap-1.5 bg-warm-100 hover:bg-warm-200 text-warm-700 hover:text-crimson px-3 py-1.5 rounded-lg transition text-sm"
                aria-label={`Theme: ${theme}`}
                title={`Theme: ${theme}`}
              >
                {theme === 'dark' ? (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                  </svg>
                ) : theme === 'light' ? (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                )}
                <span className="capitalize">{theme}</span>
              </button>
              <button
                onClick={signOut}
                disabled={isSigningOut}
                className="bg-warm-100 hover:bg-warm-200 text-warm-700 hover:text-crimson text-sm px-3 py-1.5 rounded-lg transition"
              >
                {isSigningOut ? '...' : 'Sign Out'}
              </button>
            </div>

            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 text-warm-600 hover:text-crimson transition"
              aria-label="Toggle menu"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {mobileMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>

        {mobileMenuOpen && (
          <div className="md:hidden border-t border-warm-200 bg-card">
            <div className="px-4 py-3 space-y-1">
              {navItems.map(item => {
                const isActive = location.pathname === item.path
                return (
                  <button
                    key={item.path}
                    onClick={() => { navigate(item.path); setMobileMenuOpen(false) }}
                    className={`block w-full text-left px-4 py-3 text-sm rounded-lg transition ${
                      isActive
                        ? 'text-crimson bg-warm-100 font-medium'
                        : 'text-warm-600 hover:text-crimson hover:bg-warm-50'
                    }`}
                  >
                    {item.label}
                  </button>
                )
              })}
              <div className="border-t border-warm-200 pt-3 mt-3 space-y-1">
                <span className="block px-4 py-2 text-sm text-warm-500 truncate">{user.email}</span>
                <button
                  onClick={() => { toggle(); setMobileMenuOpen(false) }}
                  className="w-full flex items-center gap-2 px-4 py-3 text-sm text-warm-600 hover:text-crimson hover:bg-warm-50 rounded-lg transition"
                >
                  {theme === 'dark' ? '🌙' : theme === 'light' ? '☀️' : '💻'}
                  <span>Theme: <span className="capitalize">{theme}</span></span>
                </button>
                <button
                  onClick={() => { signOut(); setMobileMenuOpen(false) }}
                  disabled={isSigningOut}
                  className="w-full text-left px-4 py-3 text-sm text-warm-600 hover:text-crimson hover:bg-warm-50 rounded-lg transition"
                >
                  {isSigningOut ? 'Signing out...' : 'Sign Out'}
                </button>
              </div>
            </div>
          </div>
        )}
      </nav>

      <main className={`mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8 ${mw}`}>
        {children}
      </main>
    </div>
  )
}
