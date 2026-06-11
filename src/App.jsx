import React from 'react'
import { BrowserRouter, Routes, Route, Link, Navigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { supabase } from './lib/supabase'
import Login from './pages/Login'
import Register from './pages/Register'
import Browse from './pages/Browse'

function Navbar({ user, onLogout }) {
  return (
    <nav className="bg-white shadow-md p-4">
      <div className="container mx-auto flex justify-between items-center">
        <Link to="/browse" className="text-xl font-bold text-purple-600">StreamApp</Link>
        <div className="space-x-4">
          {user ? (
            <button onClick={onLogout}
              className="text-gray-600 hover:text-purple-600 font-medium">
              Logout
            </button>
          ) : (
            <>
              <Link to="/login" className="text-gray-600 hover:text-purple-600">Login</Link>
              <Link to="/register" className="text-gray-600 hover:text-purple-600">Register</Link>
            </>
          )}
        </div>
      </div>
    </nav>
  )
}

function App() {
  const [user, setUser] = useState(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })
    return () => subscription.unsubscribe()
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
  }

  return (
    <BrowserRouter>
      <div className="min-h-screen bg-gray-50">
        <Navbar user={user} onLogout={handleLogout} />
        <Routes>
          <Route path="/" element={<Navigate to={user ? '/browse' : '/login'} replace />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/browse" element={user ? <Browse user={user} /> : <Navigate to="/login" replace />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </BrowserRouter>
  )
}

export default App