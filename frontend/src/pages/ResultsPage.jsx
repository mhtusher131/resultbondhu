import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { examsAPI, resultsAPI } from '../services/api'
import { Download, FileText, MessageCircle, CheckCircle } from 'lucide-react'
import toast from 'react-hot-toast'

function GradeCell({ letter }) {
  const cls = {
    'A+': 'grade-aplus', A: 'grade-a', 'A-': 'grade-aminus',
    B: 'grade-b', C: 'grade-c', D: 'grade-d', F: 'grade-f'
  }[letter] || ''
  return <span className={cls}>{letter}</span>
}

export default function ResultsPage() {
  const [searchParams] = useSearchParams()
  const [exams, setExams] = useState([])
  const [selectedExam, setSelectedExam] = useState(searchParams.get('exam') || '')
  const [results, setResults] = useState(null)
  const [loading, setLoading] = useState(false)
  const [waCopied, setWaCopied] = useState(false)
  const [search, setSearch] = useState('')

  useEffect(() => {
    examsAPI.list().then(r => setExams(r.data))
  }, [])

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => {
    if (!selectedExam) { setResults(null); return }
    setLoading(true)
    resultsAPI.get(selectedExam)
      .then(r => setResults(r.data))
      .catch(() => toast.error('Failed to load results — enter marks first'))
      .finally(() => setLoading(false))
  }, [selectedExam])

  const handleWAShare = async () => {
    try {
      const res = await resultsAPI.whatsapp(selectedExam)
      await navigator.clipboard.writeText(res.data.text)
      setWaCopied(true)
      toast.success('WhatsApp summary copied!')
      setTimeout(() => setWaCopied(false), 3000)
    } catch { toast.error('Copy failed') }
  }

  const downloadBlob = (blob, filename) => {
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    link.remove()
    window.URL.revokeObjectURL(url)
  }

  const getFilenameFromResponse = (headers, fallback) => {
    const disposition = headers['content-disposition']
    if (!disposition) return fallback
    const match = /filename="?([^";]+)"?/.exec(disposition)
    return match ? match[1] : fallback
  }

  const handleExport = async (type) => {
    try {
      const res = type === 'pdf'
        ? await resultsAPI.exportPDF(selectedExam)
        : await resultsAPI.exportExcel(selectedExam)
      const filename = getFilenameFromResponse(res.headers, `result.${type}`)
      downloadBlob(res.data, filename)
    } catch {
      toast.error('Export failed. Please login and try again.')
    }
  }

  const handleStudentExport = async (roll) => {
    try {
      const res = await resultsAPI.exportStudentPDF(selectedExam, roll)
      const filename = getFilenameFromResponse(res.headers, `student_${roll}.pdf`)
      downloadBlob(res.data, filename)
    } catch {
      toast.error('Student export failed. Please login and try again.')
    }
  }

  const filtered = results?.results?.filter(r =>
    !search || String(r.roll).includes(search) || r.full_name.toLowerCase().includes(search.toLowerCase())
  ) || []

  const subjectNames = results?.results?.[0]?.subject_results?.map(s => s.subject_name) || []

  return (
    <div>
      <div className="page-header">
        <h1>Results & Grade Sheet</h1>
        <p>View, export, and share exam results</p>
      </div>

      {/* Exam selector */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="form-row" style={{ alignItems: 'flex-end' }}>
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">Select Exam</label>
            <select className="form-control" value={selectedExam} onChange={e => setSelectedExam(e.target.value)}>
              <option value="">— Choose Exam to View Results —</option>
              {exams.map(ex => (
                <option key={ex.id} value={ex.id}>
                  {ex.college.name} — {ex.year} {ex.term} ({ex.group})
                </option>
              ))}
            </select>
          </div>
          {results && (
            <div style={{ display: 'flex', gap: 8 }}>
              <button type="button" className="btn btn-outline" onClick={() => handleExport('excel')}>
                <Download size={14} /> Excel
              </button>
              <button type="button" className="btn btn-outline" onClick={() => handleExport('pdf')}>
                <FileText size={14} /> PDF
              </button>
              <button className="btn btn-primary" onClick={handleWAShare}>
                {waCopied ? <CheckCircle size={14} /> : <MessageCircle size={14} />}
                {waCopied ? 'Copied!' : 'WhatsApp'}
              </button>
            </div>
          )}
        </div>
      </div>

      {loading && <div style={{ textAlign: 'center', padding: '3rem' }}><span className="spinner" style={{ width: 32, height: 32 }} /></div>}

      {results && (
        <>
          {/* Summary stats */}
          <div className="stat-grid">
            <div className="stat-card">
              <div className="stat-label">Total Appeared</div>
              <div className="stat-value">{results.appeared}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Passed</div>
              <div className="stat-value" style={{ color: 'var(--brand)' }}>{results.passed}</div>
              <div className="stat-sub">Pass rate: {results.pass_rate}%</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Failed</div>
              <div className="stat-value" style={{ color: 'var(--danger)' }}>{results.failed}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Average GPA</div>
              <div className="stat-value" style={{ color: 'var(--brand)' }}>{results.average_gpa}</div>
              <div className="stat-sub">A+ count: {results.a_plus_count}</div>
            </div>
          </div>

          {/* Grade distribution */}
          {(() => {
            const dist = { 'A+': 0, A: 0, 'A-': 0, B: 0, C: 0, D: 0, F: 0 }
            results.results.forEach(r => {
              const g = r.gpa >= 5 ? 'A+' : r.gpa >= 4 ? 'A' : r.gpa >= 3.5 ? 'A-' : r.gpa >= 3 ? 'B' : r.gpa >= 2 ? 'C' : r.gpa >= 1 ? 'D' : 'F'
              dist[g]++
            })
            const colors = { 'A+': '#1D9E75', A: '#378ADD', 'A-': '#5DCAA5', B: '#EF9F27', C: '#BA7517', D: '#E24B4A', F: '#A32D2D' }
            const max = Math.max(...Object.values(dist), 1)
            return (
              <div className="card" style={{ marginBottom: 16 }}>
                <div className="card-header"><span className="card-title">GPA Distribution</span></div>
                <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end', height: 80 }}>
                  {Object.entries(dist).map(([grade, count]) => (
                    <div key={grade} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                      <span style={{ fontSize: 11, color: 'var(--gray-400)' }}>{count}</span>
                      <div style={{
                        width: '100%', background: colors[grade] + '30',
                        borderRadius: '4px 4px 0 0',
                        height: Math.max((count / max) * 60, 4),
                        border: `1px solid ${colors[grade]}40`,
                        borderBottom: 'none',
                      }} />
                      <span style={{ fontSize: 12, fontWeight: 600, color: colors[grade] }}>{grade}</span>
                    </div>
                  ))}
                </div>
              </div>
            )
          })()}

          {/* Search */}
          <div style={{ marginBottom: 12 }}>
            <input
              className="form-control"
              placeholder="Search by roll number or name..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ maxWidth: 300 }}
            />
          </div>

          {/* Results table */}
          <div className="card">
            <div className="card-header">
              <span className="card-title">Grade Sheet ({filtered.length} students)</span>
            </div>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Roll</th>
                    <th>Name</th>
                    {subjectNames.map(s => <th key={s}>{s}</th>)}
                    <th>4th Subject</th>
                    <th>GPA</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(res => (
                    <tr key={res.roll}>
                      <td style={{ fontWeight: 600, color: 'var(--brand)' }}>{res.roll}</td>
                      <td style={{ fontWeight: 500 }}>{res.full_name}</td>
                      {res.subject_results.map(sr => (
                        <td key={sr.subject_name} style={{ textAlign: 'center' }}>
                          <GradeCell letter={sr.grade_letter} />
                          <div style={{ fontSize: 10, color: 'var(--gray-400)' }}>{sr.marks}</div>
                        </td>
                      ))}
                      <td style={{ textAlign: 'center', color: 'var(--brand)', fontWeight: 600 }}>
                        {res.optional_subject || '—'}
                      </td>
                      <td style={{ fontWeight: 700, color: res.gpa >= 4 ? 'var(--brand)' : res.gpa >= 3 ? 'var(--warning)' : 'var(--danger)' }}>
                        {res.gpa}
                      </td>
                      <td>
                        <span className={`badge ${res.status === 'PASS' ? 'badge-green' : 'badge-red'}`}>
                          {res.status}
                        </span>
                      </td>
                      <td>
                        <button className="btn btn-ghost btn-sm" onClick={() => handleStudentExport(res.roll)}>
                          <Download size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {!selectedExam && (
        <div className="empty-state card" style={{ padding: '3rem' }}>
          <p>Select an exam to view results</p>
        </div>
      )}
    </div>
  )
}
