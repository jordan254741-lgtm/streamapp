import type { User } from '@supabase/supabase-js'
import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

import { useAuth } from '../hooks/useAuth'

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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const navItems = [
    { label: 'Browse', path: '/browse' },
    { label: 'Requests', path: '/requests' },
    { label: 'Downloads', path: '/downloads' },
  ]

  const mw = maxWidthClasses[maxWidth] || 'max-w-7xl'

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <nav className="bg-gray-900/95 backdrop-blur-sm border-b border-gray-800 sticky top-0 z-50">
        <div className="max-w-screen-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14 sm:h-16">
            <div className="flex items-center gap-2 sm:gap-8">
              {showBack && (
                <button
                  onClick={() => navigate(backTo || '/browse')}
                  className="text-gray-400 hover:text-white text-sm flex items-center gap-1 mr-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  {backLabel || 'Back'}
                </button>
              )}
              <h1
                onClick={() => navigate('/browse')}
                className="text-lg sm:text-xl font-bold text-white cursor-pointer select-none"
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
                          ? 'text-white bg-gray-800'
                          : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
                      }`}
                    >
                      {item.label}
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="hidden md:flex items-center gap-3">
              <span className="text-gray-500 text-sm truncate max-w-[180px] xl:max-w-[240px]">{user.email}</span>
              <button
                onClick={signOut}
                disabled={isSigningOut}
                className="bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white text-sm px-3 py-1.5 rounded-lg transition text-xs"
              >
                {isSigningOut ? '...' : 'Sign Out'}
              </button>
            </div>

            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 text-gray-400 hover:text-white"
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
          <div className="md:hidden border-t border-gray-800 bg-gray-900">
            <div className="px-4 py-3 space-y-1">
              {navItems.map(item => {
                const isActive = location.pathname === item.path
                return (
                  <button
                    key={item.path}
                    onClick={() => { navigate(item.path); setMobileMenuOpen(false) }}
                    className={`block w-full text-left px-4 py-3 text-sm rounded-lg transition ${
                      isActive
                        ? 'text-white bg-gray-800'
                        : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
                    }`}
                  >
                    {item.label}
                  </button>
                )
              })}
              <div className="border-t border-gray-800 pt-3 mt-3 space-y-1">
                <span className="block px-4 py-2 text-sm text-gray-500 truncate">{user.email}</span>
                <button
                  onClick={() => { signOut(); setMobileMenuOpen(false) }}
                  disabled={isSigningOut}
                  className="w-full text-left px-4 py-3 text-sm text-gray-400 hover:text-white hover:bg-gray-800/50 rounded-lg transition"
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
