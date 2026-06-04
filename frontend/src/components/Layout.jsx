import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import {
  LayoutDashboard, BookOpen, Users, GraduationCap,
  ClipboardList, BarChart3, LogOut, Menu, X,
  Building2, FileSpreadsheet, ChevronDown
} from 'lucide-react'

const NAV = [
  { label: 'Dashboard', icon: LayoutDashboard, path: '/' },
  { label: 'Exams', icon: BookOpen, path: '/exams' },
  { label: 'Students', icon: GraduationCap, path: '/students' },
  { label: 'Subjects', icon: ClipboardList, path: '/subjects' },
  { label: 'Mark Entry', icon: FileSpreadsheet, path: '/marks' },
  { label: 'Results', icon: BarChart3, path: '/results' },
  { label: 'Users', icon: Users, path: '/users', adminOnly: true },
  { label: 'College', icon: Building2, path: '/college', adminOnly: true },
]

export default function Layout({ children }) {
  const { user, logout, isAdmin } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(true)

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const nav = NAV.filter(n => !n.adminOnly || isAdmin)

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      {/* Sidebar */}
      <aside style={{
        width: sidebarOpen ? '240px' : '60px',
        background: '#fff',
        borderRight: '1px solid var(--gray-100)',
        display: 'flex',
        flexDirection: 'column',
        transition: 'width 0.2s',
        overflow: 'hidden',
        flexShrink: 0,
        boxShadow: 'var(--shadow)',
      }}>
        {/* Logo */}
        <div style={{
          padding: '0 16px',
          height: '60px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          borderBottom: '1px solid var(--gray-100)',
          background: 'var(--brand)',
        }}>
          <div style={{
            width: 32, height: 32, background: 'rgba(255,255,255,0.2)',
            borderRadius: 8, display: 'flex', alignItems: 'center',
            justifyContent: 'center', flexShrink: 0
          }}>
            <span style={{ fontSize: 16 }}>📋</span>
          </div>
          {sidebarOpen && (
            <div style={{ overflow: 'hidden' }}>
              <div style={{ fontWeight: 700, fontSize: 14, color: '#fff', whiteSpace: 'nowrap' }}>ResultBondhu</div>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.7)', whiteSpace: 'nowrap' }}>রেজাল্ট বন্ধু</div>
            </div>
          )}
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: '12px 8px', overflowY: 'auto' }}>
          {nav.map(item => {
            const active = location.pathname === item.path ||
              (item.path !== '/' && location.pathname.startsWith(item.path))
            return (
              <Link
                key={item.path}
                to={item.path}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '9px 10px',
                  borderRadius: 8,
                  marginBottom: 2,
                  color: active ? 'var(--brand)' : 'var(--gray-600)',
                  background: active ? 'var(--brand-light)' : 'transparent',
                  fontWeight: active ? 600 : 400,
                  fontSize: 13,
                  textDecoration: 'none',
                  transition: 'all 0.12s',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                }}
                onMouseEnter={e => { if (!active) e.currentTarget.style.background = 'var(--gray-50)' }}
                onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent' }}
              >
                <item.icon size={17} style={{ flexShrink: 0 }} />
                {sidebarOpen && item.label}
              </Link>
            )
          })}
        </nav>

        {/* User info + logout */}
        <div style={{
          padding: '12px 8px',
          borderTop: '1px solid var(--gray-100)',
        }}>
          {sidebarOpen && (
            <div style={{ padding: '8px 10px', marginBottom: 4 }}>
              <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--gray-800)' }}>
                {user?.full_name}
              </div>
              <div style={{ fontSize: 11, color: 'var(--gray-400)', textTransform: 'capitalize' }}>
                {user?.role}
              </div>
            </div>
          )}
          <button
            onClick={handleLogout}
            style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '9px 10px', borderRadius: 8, width: '100%',
              border: 'none', background: 'transparent', cursor: 'pointer',
              color: 'var(--danger)', fontSize: 13, fontWeight: 500,
            }}
          >
            <LogOut size={16} />
            {sidebarOpen && 'Sign Out'}
          </button>
        </div>
      </aside>

      {/* Main */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Top bar */}
        <header style={{
          height: 60, background: '#fff',
          borderBottom: '1px solid var(--gray-100)',
          display: 'flex', alignItems: 'center',
          padding: '0 20px', gap: 12,
          boxShadow: 'var(--shadow)',
          flexShrink: 0,
        }}>
          <button
            onClick={() => setSidebarOpen(o => !o)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 6, borderRadius: 6, color: 'var(--gray-600)' }}
          >
            <Menu size={18} />
          </button>
          <div style={{ flex: 1 }} />
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '5px 10px', borderRadius: 8,
            background: 'var(--brand-light)',
          }}>
            <div style={{
              width: 28, height: 28, borderRadius: '50%',
              background: 'var(--brand)', display: 'flex',
              alignItems: 'center', justifyContent: 'center',
              color: '#fff', fontSize: 12, fontWeight: 700,
            }}>
              {user?.full_name?.[0]?.toUpperCase()}
            </div>
            <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--brand-dark)' }}>
              {user?.full_name}
            </span>
            <span className="badge badge-green" style={{ fontSize: 10 }}>
              {user?.role}
            </span>
          </div>
        </header>

        {/* Page content */}
        <main style={{ flex: 1, overflowY: 'auto', padding: '24px 28px' }}>
          {children}
        </main>
      </div>
    </div>
  )
}
