import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { examsAPI, studentsAPI, subjectsAPI, resultsAPI } from '../services/api'
import { BookOpen, GraduationCap, ClipboardList, BarChart3, ArrowRight, TrendingUp } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

export default function Dashboard() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [exams, setExams] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    examsAPI.list().then(r => setExams(r.data)).catch(() => {}).finally(() => setLoading(false))
  }, [])

  const latestExam = exams[exams.length - 1]

  return (
    <div>
      <div className="page-header">
        <h1>Welcome, {user?.full_name} 👋</h1>
        <p>ResultBondhu — HSC Exam Result & GPA Management System</p>
      </div>

      {/* Quick stats */}
      <div className="stat-grid">
        <div className="stat-card">
          <div className="stat-label">Total Exams</div>
          <div className="stat-value" style={{ color: 'var(--brand)' }}>{exams.length}</div>
          <div className="stat-sub">Configured in system</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Latest Exam</div>
          <div className="stat-value" style={{ fontSize: 16, marginTop: 8 }}>
            {latestExam ? `${latestExam.year}` : '—'}
          </div>
          <div className="stat-sub">{latestExam?.term || 'No exams yet'}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">System Status</div>
          <div style={{ marginTop: 8 }}>
            <span className="badge badge-green" style={{ fontSize: 12 }}>● Online</span>
          </div>
          <div className="stat-sub">All systems operational</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Your Role</div>
          <div style={{ marginTop: 8 }}>
            <span className="badge badge-blue" style={{ fontSize: 12, textTransform: 'capitalize' }}>
              {user?.role}
            </span>
          </div>
          <div className="stat-sub">Access level</div>
        </div>
      </div>

      {/* Quick action cards */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
        {[
          { icon: BookOpen, label: 'Manage Exams', sub: 'Create and configure exam sessions', path: '/exams', color: 'var(--brand)' },
          { icon: GraduationCap, label: 'Students', sub: 'Add students and roll numbers', path: '/students', color: 'var(--info)' },
          { icon: ClipboardList, label: 'Mark Entry', sub: 'Enter or import marks per subject', path: '/marks', color: 'var(--warning)' },
          { icon: BarChart3, label: 'View Results', sub: 'GPA, grade sheets and exports', path: '/results', color: '#9B59B6' },
        ].map(item => (
          <div
            key={item.path}
            className="card"
            onClick={() => navigate(item.path)}
            style={{ cursor: 'pointer', transition: 'all 0.15s', display: 'flex', alignItems: 'center', gap: 16 }}
            onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
            onMouseLeave={e => e.currentTarget.style.transform = 'none'}
          >
            <div style={{
              width: 48, height: 48, borderRadius: 12,
              background: item.color + '18',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
            }}>
              <item.icon size={22} style={{ color: item.color }} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--gray-800)' }}>{item.label}</div>
              <div style={{ fontSize: 12, color: 'var(--gray-400)', marginTop: 2 }}>{item.sub}</div>
            </div>
            <ArrowRight size={16} style={{ color: 'var(--gray-300)' }} />
          </div>
        ))}
      </div>

      {/* Recent exams */}
      <div className="card">
        <div className="card-header">
          <span className="card-title">Recent Exams</span>
          <button className="btn btn-outline btn-sm" onClick={() => navigate('/exams')}>View All</button>
        </div>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '2rem' }}><span className="spinner" /></div>
        ) : exams.length === 0 ? (
          <div className="empty-state">
            <BookOpen size={40} style={{ margin: '0 auto 12px', display: 'block', opacity: 0.25 }} />
            <p>No exams configured yet</p>
            <button className="btn btn-primary btn-sm" style={{ marginTop: 12 }} onClick={() => navigate('/exams')}>
              Create First Exam
            </button>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>College</th>
                  <th>Year</th>
                  <th>Term</th>
                  <th>Group</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {exams.slice().reverse().map(exam => (
                  <tr key={exam.id}>
                    <td style={{ fontWeight: 500 }}>{exam.college.name}</td>
                    <td>{exam.year}</td>
                    <td>{exam.term}</td>
                    <td><span className="badge badge-blue">{exam.group}</span></td>
                    <td>
                      <span className={`badge ${exam.is_published ? 'badge-green' : 'badge-amber'}`}>
                        {exam.is_published ? 'Published' : 'Draft'}
                      </span>
                    </td>
                    <td>
                      <button
                        className="btn btn-ghost btn-sm"
                        onClick={() => navigate(`/results?exam=${exam.id}`)}
                      >
                        View Results
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* HSC GPA Scale */}
      <div className="card" style={{ marginTop: 16 }}>
        <div className="card-header">
          <span className="card-title">HSC GPA Scale Reference</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 8 }}>
          {[
            { range: '80–100', letter: 'A+', gpa: '5.00', cls: 'grade-aplus', bg: '#E1F5EE' },
            { range: '70–79', letter: 'A', gpa: '4.00', cls: 'grade-a', bg: '#E6F1FB' },
            { range: '60–69', letter: 'A-', gpa: '3.50', cls: 'grade-aminus', bg: '#E8F8F3' },
            { range: '50–59', letter: 'B', gpa: '3.00', cls: 'grade-b', bg: '#FAEEDA' },
            { range: '40–49', letter: 'C', gpa: '2.00', cls: 'grade-c', bg: '#FDF3E3' },
            { range: '33–39', letter: 'D', gpa: '1.00', cls: 'grade-d', bg: '#FCEBEB' },
            { range: '0–32', letter: 'F', gpa: '0.00', cls: 'grade-f', bg: '#FCE8E8' },
          ].map(g => (
            <div key={g.letter} style={{
              background: g.bg, borderRadius: 8, padding: '10px 8px', textAlign: 'center'
            }}>
              <div className={g.cls} style={{ fontSize: 20 }}>{g.letter}</div>
              <div style={{ fontSize: 11, color: 'var(--gray-600)', marginTop: 2 }}>{g.gpa}</div>
              <div style={{ fontSize: 10, color: 'var(--gray-400)', marginTop: 2 }}>{g.range}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
