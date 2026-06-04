import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthProvider, useAuth } from './context/AuthContext'
import Layout from './components/Layout'
import LoginPage from './pages/LoginPage'
import Dashboard from './pages/Dashboard'
import ExamsPage from './pages/ExamsPage'
import StudentsPage from './pages/StudentsPage'
import SubjectsPage from './pages/SubjectsPage'
import MarksPage from './pages/MarksPage'
import ResultsPage from './pages/ResultsPage'
import UsersPage from './pages/UsersPage'
import './index.css'

function PrivateRoute({ children, adminOnly }) {
  const { user } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  if (adminOnly && user.role !== 'admin') return <Navigate to="/" replace />
  return <Layout>{children}</Layout>
}

function AppRoutes() {
  const { user } = useAuth()
  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <LoginPage />} />
      <Route path="/" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
      <Route path="/exams" element={<PrivateRoute><ExamsPage /></PrivateRoute>} />
      <Route path="/students" element={<PrivateRoute><StudentsPage /></PrivateRoute>} />
      <Route path="/subjects" element={<PrivateRoute><SubjectsPage /></PrivateRoute>} />
      <Route path="/marks" element={<PrivateRoute><MarksPage /></PrivateRoute>} />
      <Route path="/results" element={<PrivateRoute><ResultsPage /></PrivateRoute>} />
      <Route path="/users" element={<PrivateRoute adminOnly><UsersPage /></PrivateRoute>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
        <Toaster position="top-right" toastOptions={{ duration: 3000, style: { fontSize: 13 } }} />
      </AuthProvider>
    </BrowserRouter>
  )
}
