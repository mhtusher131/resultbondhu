import { useEffect, useState } from 'react'
import { examsAPI, collegesAPI } from '../services/api'
import { Plus, Trash2, Send, BookOpen, Pencil, X } from 'lucide-react'
import toast from 'react-hot-toast'

const TERMS = ['1st Semester (Test)', '2nd Semester (Pre-Test)', 'Final (HSC)', 'Mock Test']
const EXAM_TYPES = [
  { value: 'first_year', label: 'First Year' },
  { value: 'second_year', label: 'Second Year' },
  { value: 'test_exam', label: 'Test Exam' },
]
const GROUPS = ['Science', 'Commerce', 'Humanities']
const BLANK = { college_id: '', college_name: '', year: new Date().getFullYear(), term: TERMS[0], group: GROUPS[0], exam_type: EXAM_TYPES[0].value }

export default function ExamsPage() {
  const [exams, setExams] = useState([])
  const [colleges, setColleges] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingExam, setEditingExam] = useState(null)
  const [form, setForm] = useState(BLANK)
  const [saving, setSaving] = useState(false)

  const load = () => {
    setLoading(true)
    Promise.all([examsAPI.list(), collegesAPI.list()])
      .then(([e, c]) => { setExams(e.data); setColleges(c.data) })
      .catch(() => toast.error('Failed to load data'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const openCreate = () => {
    setEditingExam(null)
    setForm(BLANK)
    setShowForm(true)
  }

  const openEdit = (exam) => {
    setEditingExam(exam)
    setForm({
      college_id: exam.college.id,
      college_name: '',
      year: exam.year,
      term: exam.term,
      group: exam.group,
      exam_type: exam.exam_type || EXAM_TYPES[0].value,
    })
    setShowForm(true)
  }

  const closeForm = () => { setShowForm(false); setEditingExam(null) }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.college_id && !form.college_name?.trim()) {
      return toast.error('Select a college or type a new college name')
    }
    setSaving(true)
    let collegeId = form.college_id

    try {
      if (!collegeId && form.college_name?.trim()) {
        const collegeName = form.college_name.trim()
        const existing = colleges.find(c => c.name.toLowerCase() === collegeName.toLowerCase())
        if (existing) {
          collegeId = existing.id
        } else {
          const newCollege = await collegesAPI.create({ name: collegeName })
          collegeId = newCollege.data.id
          setColleges(prev => [...prev, newCollege.data])
        }
      }

      const payload = {
        college_id: parseInt(collegeId),
        year: parseInt(form.year),
        term: form.term,
        group: form.group,
        exam_type: form.exam_type,
      }

      if (editingExam) {
        await examsAPI.update(editingExam.id, payload)
        toast.success('Exam updated!')
      } else {
        await examsAPI.create(payload)
        toast.success('Exam created!')
      }
      closeForm()
      load()
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed')
    } finally { setSaving(false) }
  }

  const handlePublish = async (id) => {
    if (!confirm('Publish this exam? Results will be visible.')) return
    try { await examsAPI.publish(id); toast.success('Exam published!'); load() }
    catch { toast.error('Failed to publish') }
  }

  const handleDelete = async (id) => {
    if (!confirm('Delete this exam? This cannot be undone.')) return
    try { await examsAPI.delete(id); toast.success('Exam deleted'); load() }
    catch { toast.error('Cannot delete — marks may exist') }
  }

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div><h1>Exams</h1><p>Create and manage exam sessions</p></div>
        <button className="btn btn-primary" onClick={openCreate}><Plus size={15} /> New Exam</button>
      </div>

      {showForm && (
        <div className="card" style={{ marginBottom: 20, border: '1.5px solid var(--brand)' }}>
          <div className="card-header">
            <span className="card-title" style={{ color: 'var(--brand)' }}>
              {editingExam ? '✏️ Edit Exam' : '➕ Create New Exam'}
            </span>
            <button className="btn btn-ghost btn-sm btn-icon" onClick={closeForm}><X size={15} /></button>
          </div>
          <form onSubmit={handleSubmit}>
            <div className="form-row" style={{ marginBottom: 12 }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">College</label>
                <select className="form-control" value={form.college_id} onChange={e => setForm(f => ({ ...f, college_id: e.target.value, college_name: '' }))}>
                  <option value="">Select college...</option>
                  {colleges.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <small style={{ color: 'var(--gray-500)', fontSize: 12, marginTop: 4, display: 'block' }}>
                  Or type a new college below to create it automatically.
                </small>
              </div>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Year</label>
                <input type="number" className="form-control" value={form.year} onChange={e => setForm(f => ({ ...f, year: e.target.value }))} min="2020" max="2035" required />
              </div>
            </div>
            <div className="form-row" style={{ marginBottom: 12 }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">New College Name</label>
                <IMESafeInput
                  type="text"
                  className="form-control"
                  value={form.college_name}
                  onChange={e => setForm(f => ({ ...f, college_name: e.target.value, college_id: '' }))}
                  placeholder="Type a new college name"
                />
              </div>
            </div>
            <div className="form-row" style={{ marginBottom: 16 }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Term / Semester</label>
                <select className="form-control" value={form.term} onChange={e => setForm(f => ({ ...f, term: e.target.value }))}>
                  {TERMS.map(t => <option key={t}>{t}</option>)}
                </select>
              </div>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Exam Type</label>
                <select className="form-control" value={form.exam_type} onChange={e => setForm(f => ({ ...f, exam_type: e.target.value }))}>
                  {EXAM_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Group</label>
                <select className="form-control" value={form.group} onChange={e => setForm(f => ({ ...f, group: e.target.value }))}>
                  {GROUPS.map(g => <option key={g}>{g}</option>)}
                </select>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? <span className="spinner" style={{ width: 14, height: 14 }} /> : (editingExam ? <Pencil size={14} /> : <Plus size={14} />)}
                {saving ? 'Saving...' : (editingExam ? 'Update Exam' : 'Create Exam')}
              </button>
              <button type="button" className="btn btn-ghost" onClick={closeForm}>Cancel</button>
            </div>
          </form>
        </div>
      )}

      <div className="card">
        <div className="card-header">
          <span className="card-title">All Exams ({exams.length})</span>
        </div>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '2rem' }}><span className="spinner" /></div>
        ) : exams.length === 0 ? (
          <div className="empty-state">
            <BookOpen size={40} style={{ margin: '0 auto 12px', display: 'block', opacity: 0.2 }} />
            <p>No exams yet. Click "New Exam" to get started.</p>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>#</th><th>College</th><th>Year</th><th>Term</th><th>Type</th><th>Group</th><th>Status</th><th>Actions</th></tr>
              </thead>
              <tbody>
                {exams.map(exam => (
                  <tr key={exam.id}>
                    <td style={{ color: 'var(--gray-400)' }}>{exam.id}</td>
                    <td style={{ fontWeight: 500 }}>{exam.college.name}</td>
                    <td>{exam.year}</td>
                    <td>{exam.term}</td>
                    <td>{EXAM_TYPES.find(type => type.value === exam.exam_type)?.label || exam.exam_type}</td>
                    <td><span className="badge badge-blue">{exam.group}</span></td>
                    <td>
                      <span className={`badge ${exam.is_published ? 'badge-green' : 'badge-amber'}`}>
                        {exam.is_published ? '✓ Published' : '⏳ Draft'}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button className="btn btn-ghost btn-sm" onClick={() => openEdit(exam)}>
                          <Pencil size={12} /> Edit
                        </button>
                        {!exam.is_published && (
                          <button className="btn btn-outline btn-sm" onClick={() => handlePublish(exam.id)}>
                            <Send size={12} /> Publish
                          </button>
                        )}
                        <button className="btn btn-danger btn-sm btn-icon" onClick={() => handleDelete(exam.id)}>
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}