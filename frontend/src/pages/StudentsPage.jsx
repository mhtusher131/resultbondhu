import { useEffect, useState } from 'react'
import { examsAPI, studentsAPI, subjectsAPI } from '../services/api'
import { Plus, Trash2, Users, Upload, Pencil, X, Check } from 'lucide-react'
import toast from 'react-hot-toast'

const BLANK = { roll: '', full_name: '', registration_number: '', guardian_phone: '', optional_subject: '' }

export default function StudentsPage() {
  const [exams, setExams] = useState([])
  const [selectedExam, setSelectedExam] = useState('')
  const [students, setStudents] = useState([])
  const [subjects, setSubjects] = useState([])
  const [loading, setLoading] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [editingStudent, setEditingStudent] = useState(null)
  const [form, setForm] = useState(BLANK)
  const [bulkText, setBulkText] = useState('')
  const [showBulk, setShowBulk] = useState(false)
  const [saving, setSaving] = useState(false)
  // Inline editing in table
  const [inlineEdit, setInlineEdit] = useState(null)  // student id being inline-edited
  const [inlineForm, setInlineForm] = useState({})

  useEffect(() => { examsAPI.list().then(r => setExams(r.data)) }, [])

  const loadStudents = () => {
    if (!selectedExam) return
    setLoading(true)
    studentsAPI.list(selectedExam).then(r => setStudents(r.data)).finally(() => setLoading(false))
  }

  useEffect(() => { loadStudents() }, [selectedExam])

  useEffect(() => {
    if (!selectedExam) { setSubjects([]); return }
    subjectsAPI.list(selectedExam).then(r => setSubjects(r.data)).catch(() => setSubjects([]))
  }, [selectedExam])

  const openCreate = () => {
    setEditingStudent(null)
    setForm(BLANK)
    setShowForm(true)
    setShowBulk(false)
  }

  const openEdit = (student) => {
    setEditingStudent(student)
    setForm({
      roll: student.roll,
      full_name: student.full_name,
      registration_number: student.registration_number || '',
      guardian_phone: student.guardian_phone || '',
      optional_subject: student.optional_subject || '',
    })
    setShowForm(true)
    setShowBulk(false)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const startInlineEdit = (student) => {
    setInlineEdit(student.id)
    setInlineForm({
      roll: student.roll,
      full_name: student.full_name,
      registration_number: student.registration_number || '',
      guardian_phone: student.guardian_phone || '',
      optional_subject: student.optional_subject || '',
    })
  }

  const cancelInline = () => { setInlineEdit(null); setInlineForm({}) }

  const saveInline = async (student) => {
    setSaving(true)
    try {
      await studentsAPI.update(student.id, {
        ...inlineForm,
        exam_id: parseInt(selectedExam),
        roll: parseInt(inlineForm.roll),
      })
      toast.success('Student updated!')
      setInlineEdit(null)
      loadStudents()
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to update')
    } finally { setSaving(false) }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    const payload = { ...form, exam_id: parseInt(selectedExam), roll: parseInt(form.roll) }
    try {
      if (editingStudent) {
        await studentsAPI.update(editingStudent.id, payload)
        toast.success('Student updated!')
      } else {
        await studentsAPI.create(payload)
        toast.success('Student added!')
      }
      setShowForm(false)
      setEditingStudent(null)
      setForm(BLANK)
      loadStudents()
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed')
    } finally { setSaving(false) }
  }

  const handleBulkAdd = async () => {
    const lines = bulkText.trim().split('\n').filter(Boolean)
    const list = []
    const errors = []
    lines.forEach((line, i) => {
      const parts = line.split(',').map(s => s.trim())
      if (parts.length < 2) { errors.push(`Line ${i+1}: need "Roll, Name"`); return }
      // Format: Roll, Name, RegNo (optional), Phone (optional), 4thSubject (optional)
      const roll = parseInt(parts[0])
      if (isNaN(roll)) { errors.push(`Line ${i+1}: invalid roll`); return }
      list.push({
        exam_id: parseInt(selectedExam),
        roll,
        full_name: parts[1],
        registration_number: parts[2] || null,
        guardian_phone: parts[3] || null,
        optional_subject: parts[4] || null,
      })
    })
    if (errors.length) { toast.error(errors[0]); return }
    setSaving(true)
    try {
      const res = await studentsAPI.bulkCreate(parseInt(selectedExam), list)
      toast.success(`Added ${res.data.created} students (${res.data.skipped} skipped)`)
      setBulkText(''); setShowBulk(false); loadStudents()
    } catch { toast.error('Bulk add failed') } finally { setSaving(false) }
  }

  const handleDelete = async (id) => {
    if (!confirm('Remove this student?')) return
    try { await studentsAPI.delete(id); toast.success('Removed'); loadStudents() }
    catch { toast.error('Failed') }
  }

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div><h1>Students</h1><p>Manage student roll list per exam</p></div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-ghost" onClick={() => { setShowBulk(s => !s); setShowForm(false) }}>
            <Upload size={14} /> Bulk Add
          </button>
          <button className="btn btn-primary" onClick={openCreate} disabled={!selectedExam}>
            <Plus size={14} /> Add Student
          </button>
          <button className="btn btn-danger" disabled={!selectedExam} onClick={async () => {
            if (!selectedExam) return
            if (!confirm('Mark ALL students for this exam as removed? This cannot be undone.')) return
            try {
              await studentsAPI.deleteAll(parseInt(selectedExam))
              toast.success('All students removed')
              loadStudents()
            } catch (err) {
              toast.error(err.response?.data?.detail || 'Failed to remove all')
            }
          }}>
            Delete All
          </button>
        </div>
      </div>

      {/* Exam selector */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="form-group" style={{ margin: 0 }}>
          <label className="form-label">Select Exam</label>
          <select className="form-control" value={selectedExam} onChange={e => { setSelectedExam(e.target.value); setShowForm(false); setInlineEdit(null) }}>
            <option value="">— Choose Exam —</option>
            {exams.map(ex => <option key={ex.id} value={ex.id}>{ex.college.name} — {ex.year} {ex.term}</option>)}
          </select>
        </div>
      </div>

      {/* Bulk add */}
      {showBulk && selectedExam && (
        <div className="card" style={{ marginBottom: 16, border: '1.5px solid var(--brand)' }}>
          <div className="card-header">
            <span className="card-title">Bulk Add Students</span>
            <button className="btn btn-ghost btn-sm btn-icon" onClick={() => setShowBulk(false)}><X size={15} /></button>
          </div>
          <p style={{ fontSize: 12, color: 'var(--gray-400)', marginBottom: 8 }}>
            One student per line: <code>Roll, Name, RegNo (optional), Phone (optional), 4thSubject (optional)</code>
          </p>
          <textarea className="form-control" rows={8} value={bulkText} onChange={e => setBulkText(e.target.value)}
            placeholder={`101, Rahim Uddin, REG001, 01700000001, Biology\n102, Fatema Begum, REG002\n103, Arif Hossain, , , Higher Math`}
            style={{ fontFamily: 'monospace', fontSize: 12 }} />
          <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
            <button className="btn btn-primary" onClick={handleBulkAdd} disabled={saving || !bulkText.trim()}>
              {saving ? <span className="spinner" style={{ width: 14, height: 14 }} /> : <Plus size={14} />} Add All
            </button>
            <button className="btn btn-ghost" onClick={() => setShowBulk(false)}>Cancel</button>
          </div>
        </div>
      )}

      {/* Add / Edit form */}
      {showForm && selectedExam && (
        <div className="card" style={{ marginBottom: 16, border: '1.5px solid var(--brand)' }}>
          <div className="card-header">
            <span className="card-title" style={{ color: 'var(--brand)' }}>
              {editingStudent ? '✏️ Edit Student' : '➕ Add Student'}
            </span>
            <button className="btn btn-ghost btn-sm btn-icon" onClick={() => { setShowForm(false); setEditingStudent(null) }}><X size={15} /></button>
          </div>
          <form onSubmit={handleSubmit}>
            <div className="form-row" style={{ marginBottom: 10 }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Roll Number</label>
                <input type="number" className="form-control" value={form.roll} onChange={e => setForm(f => ({ ...f, roll: e.target.value }))} required />
              </div>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Full Name</label>
                <input type="text" className="form-control" value={form.full_name} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))} required />
              </div>
            </div>
            <div className="form-row" style={{ marginBottom: 12 }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Registration No. (optional)</label>
                <input type="text" className="form-control" value={form.registration_number} onChange={e => setForm(f => ({ ...f, registration_number: e.target.value }))} />
              </div>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Guardian Phone (optional)</label>
                <input type="text" className="form-control" value={form.guardian_phone} onChange={e => setForm(f => ({ ...f, guardian_phone: e.target.value }))} />
              </div>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">4th (Optional) Subject</label>
                <select className="form-control" value={form.optional_subject || ''} onChange={e => setForm(f => ({ ...f, optional_subject: e.target.value }))}>
                  <option value="">— None —</option>
                  {subjects.map(s => <option key={s.id} value={s.name}>{s.name} ({s.code})</option>)}
                </select>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? <span className="spinner" style={{ width: 14, height: 14 }} /> : (editingStudent ? <Pencil size={14} /> : <Plus size={14} />)}
                {saving ? 'Saving...' : (editingStudent ? 'Update Student' : 'Add Student')}
              </button>
              <button type="button" className="btn btn-ghost" onClick={() => { setShowForm(false); setEditingStudent(null) }}>Cancel</button>
            </div>
          </form>
        </div>
      )}

      {/* Students table */}
      <div className="card">
        <div className="card-header">
          <span className="card-title">Students {selectedExam ? `(${students.length})` : ''}</span>
        </div>
        {!selectedExam ? (
          <div className="empty-state"><p>Select an exam to view students</p></div>
        ) : loading ? (
          <div style={{ textAlign: 'center', padding: '2rem' }}><span className="spinner" /></div>
        ) : students.length === 0 ? (
          <div className="empty-state">
            <Users size={36} style={{ display: 'block', margin: '0 auto 12px', opacity: 0.2 }} />
            <p>No students added. Use "Add Student" or "Bulk Add".</p>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>Roll</th><th>Name</th><th>Reg. No</th><th>Guardian Phone</th><th>4th Subject</th><th>Actions</th></tr>
              </thead>
              <tbody>
                {students.map(s => (
                  inlineEdit === s.id ? (
                    // ── Inline edit row ──
                    <tr key={s.id} style={{ background: 'var(--brand-light)' }}>
                      <td>
                        <input type="number" className="form-control" style={{ padding: '4px 8px', width: 70 }}
                          value={inlineForm.roll} onChange={e => setInlineForm(f => ({ ...f, roll: e.target.value }))} />
                      </td>
                      <td>
                        <input type="text" className="form-control" style={{ padding: '4px 8px' }}
                          value={inlineForm.full_name} onChange={e => setInlineForm(f => ({ ...f, full_name: e.target.value }))} />
                      </td>
                      <td>
                        <input type="text" className="form-control" style={{ padding: '4px 8px' }}
                          value={inlineForm.registration_number} onChange={e => setInlineForm(f => ({ ...f, registration_number: e.target.value }))}
                          placeholder="Reg No" />
                      </td>
                      <td>
                        <input type="text" className="form-control" style={{ padding: '4px 8px' }}
                          value={inlineForm.guardian_phone} onChange={e => setInlineForm(f => ({ ...f, guardian_phone: e.target.value }))}
                          placeholder="Phone" />
                      </td>
                      <td>
                        <select className="form-control" value={inlineForm.optional_subject || ''} onChange={e => setInlineForm(f => ({ ...f, optional_subject: e.target.value }))}>
                          <option value="">— None —</option>
                          {subjects.map(su => <option key={su.id} value={su.name}>{su.name} ({su.code})</option>)}
                        </select>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button className="btn btn-primary btn-sm" onClick={() => saveInline(s)} disabled={saving}>
                            {saving ? <span className="spinner" style={{ width: 12, height: 12 }} /> : <Check size={13} />} Save
                          </button>
                          <button className="btn btn-ghost btn-sm btn-icon" onClick={cancelInline}><X size={13} /></button>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    // ── Normal row ──
                    <tr key={s.id}>
                      <td style={{ fontWeight: 600, color: 'var(--brand)' }}>{s.roll}</td>
                      <td style={{ fontWeight: 500 }}>{s.full_name}</td>
                      <td style={{ color: 'var(--gray-400)' }}>{s.registration_number || '—'}</td>
                      <td style={{ color: 'var(--gray-400)' }}>{s.guardian_phone || '—'}</td>
                      <td style={{ color: 'var(--gray-500)' }}>{s.optional_subject || '—'}</td>
                      <td>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button className="btn btn-ghost btn-sm" onClick={() => startInlineEdit(s)}>
                            <Pencil size={12} /> Edit
                          </button>
                          <button className="btn btn-danger btn-sm btn-icon" onClick={() => handleDelete(s.id)}>
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}