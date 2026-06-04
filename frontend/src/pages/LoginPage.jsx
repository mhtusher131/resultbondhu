import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Eye, EyeOff, Lock, Mail } from 'lucide-react'

export default function LoginPage() {
  const { login, loading } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    const result = await login(email, password)
    if (result.ok) navigate('/')
    else setError(result.error)
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center',
      justifyContent: 'center', background: 'linear-gradient(135deg, #085041 0%, #1D9E75 100%)',
    }}>
      <div style={{ width: 400 }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{
            width: 64, height: 64, background: 'rgba(255,255,255,0.15)',
            borderRadius: 16, display: 'flex', alignItems: 'center',
            justifyContent: 'center', margin: '0 auto 12px', fontSize: 30,
            backdropFilter: 'blur(10px)',
          }}>📋</div>
          <h1 style={{ color: '#fff', fontSize: 24, fontWeight: 700 }}>ResultBondhu</h1>
          <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13, marginTop: 4 }}>
            রেজাল্ট বন্ধু — HSC Grade Management System
          </p>
        </div>

        {/* Card */}
        <div className="card" style={{ borderRadius: 14, padding: '2rem' }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 6 }}>Welcome back</h2>
          <p style={{ fontSize: 13, color: 'var(--gray-400)', marginBottom: 24 }}>
            Sign in to manage exam results
          </p>

          {error && (
            <div className="alert alert-error" style={{ marginBottom: 16 }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Email Address</label>
              <div style={{ position: 'relative' }}>
                <Mail size={15} style={{
                  position: 'absolute', left: 10, top: '50%',
                  transform: 'translateY(-50%)', color: 'var(--gray-400)'
                }} />
                <input
                  type="email"
                  className="form-control"
                  style={{ paddingLeft: 32 }}
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="admin@resultbondhu.com"
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Password</label>
              <div style={{ position: 'relative' }}>
                <Lock size={15} style={{
                  position: 'absolute', left: 10, top: '50%',
                  transform: 'translateY(-50%)', color: 'var(--gray-400)'
                }} />
                <input
                  type={showPass ? 'text' : 'password'}
                  className="form-control"
                  style={{ paddingLeft: 32, paddingRight: 36 }}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPass(s => !s)}
                  style={{
                    position: 'absolute', right: 10, top: '50%',
                    transform: 'translateY(-50%)', background: 'none',
                    border: 'none', cursor: 'pointer', color: 'var(--gray-400)', padding: 2
                  }}
                >
                  {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-primary btn-lg"
              style={{ width: '100%', justifyContent: 'center', marginTop: 8 }}
              disabled={loading}
            >
              {loading ? <><span className="spinner" style={{ width: 16, height: 16 }} /> Signing in...</> : 'Sign In'}
            </button>
          </form>

          <div style={{
            marginTop: 20, padding: '10px 14px',
            background: 'var(--gray-50)', borderRadius: 8,
            fontSize: 12, color: 'var(--gray-600)'
          }}>
            <strong>Default credentials:</strong><br />
            📧 admin@resultbondhu.com &nbsp; 🔑 admin123
          </div>
        </div>

        <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.5)', fontSize: 12, marginTop: 20 }}>
          ResultBondhu v1.0 — HSC Exam Controller System
        </p>
      </div>
    </div>
  )
}
