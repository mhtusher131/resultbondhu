import { createContext, useContext, useState, useEffect } from 'react'
import { authAPI } from '../services/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('rb_user')
    return saved ? JSON.parse(saved) : null
  })
  const [loading, setLoading] = useState(false)

  const login = async (email, password) => {
    setLoading(true)
    try {
      const { data } = await authAPI.login(email, password)
      localStorage.setItem('rb_token', data.access_token)
      localStorage.setItem('rb_user', JSON.stringify(data.user))
      setUser(data.user)
      return { ok: true }
    } catch (err) {
      const errorMessage = err.response?.data?.detail || err.response?.statusText || err.message || 'Login failed'
      return {
        ok: false,
        error: errorMessage === 'Network Error'
          ? 'Unable to connect to the backend server. Is the API running on http://localhost:8001?'
          : errorMessage,
      }
    } finally {
      setLoading(false)
    }
  }

  const logout = () => {
    localStorage.removeItem('rb_token')
    localStorage.removeItem('rb_user')
    setUser(null)
  }

  const isAdmin = user?.role === 'admin'
  const isController = user?.role === 'admin' || user?.role === 'controller'

  return (
    <AuthContext.Provider value={{ user, login, logout, loading, isAdmin, isController }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
