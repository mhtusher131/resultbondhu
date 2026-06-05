import { useEffect, useState } from 'react'
import { examsAPI, subjectsAPI, usersAPI } from '../services/api'
import { Plus, Trash2, Pencil, X, Check } from 'lucide-react'
import toast from 'react-hot-toast'

const BLANK = { name: '', code: '', subject_type: 'mandatory', full_marks: 100, pass_marks: 33, paper_group: '', paper_number: '', assigned_teacher_id: '' }

export default function SubjectsPage() {
  const [exams, setExams] = useState([])
  const [selectedExam, setSelectedExam] = useState('')
  const [subjects, setSubjects] = useState([])
  const [teachers, setTeachers] = useState([])
  const [loading, setLoading] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [editingSubject, setEditingSubject] = useState(null)
  const [form, setForm] = useState(BLANK)
  const [saving, setSaving] = useState(false)
  const [isComposing, setIsComposing] = useState(false)
  // Inline edit
  const [inlineEdit, setInlineEdit] = useState(null)
  const [inlineForm, setInlineForm] = useState({})
  const [inlineIsComposing, setInlineIsComposing] = useState(false)

  useEffect(() => {
    examsAPI.list().then(r => setExams(r.data))
    usersAPI.list().then(r => setTeachers(r.data.filter(u => u.role === 'teacher'))).catch(() => {})
  }, [])

  const loadSubjects = () => {
    if (!selectedExam) return
    setLoading(true)
    subjectsAPI.list(selectedExam).then(r => setSubjects(r.data)).finally(() => setLoading(false))
  }

  useEffect(() => { loadSubjects() }, [selectedExam])

  const openCreate = () => {
    setEditingSubject(null)
    setForm(BLANK)
    setShowForm(true)
  }

  const openEdit = (subj) => {
    setEditingSubject(subj)
    setForm({
      name: subj.name,
      code: subj.code,
      subject_type: subj.subject_type,
      full_marks: subj.full_marks,
      pass_marks: subj.pass_marks,
      paper_group: subj.paper_group || '',
      paper_number: subj.paper_number || '',
      assigned_teacher_id: subj.assigned_teacher_id || '',
    })
    setShowForm(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const startInlineEdit = (subj) => {
    setInlineEdit(subj.id)
    setInlineForm({
      name: subj.name,
      code: subj.code,
      subject_type: subj.subject_type,
      full_marks: subj.full_marks,
      pass_marks: subj.pass_marks,
      paper_group: subj.paper_group || '',
      paper_number: subj.paper_number || '',
      assigned_teacher_id: subj.assigned_teacher_id || '',
    })
  }

  const cancelInline = () => { setInlineEdit(null); setInlineForm({}) }

  const saveInline = async (subj) => {
    setSaving(true)
    try {
      await subjectsAPI.update(subj.id, {
        ...inlineForm,
        exam_id: parseInt(selectedExam),
        full_marks: parseInt(inlineForm.full_marks),
        pass_marks: parseInt(inlineForm.pass_marks),
        paper_group: inlineForm.paper_group || null,
        paper_number: inlineForm.paper_number ? parseInt(inlineForm.paper_number) : null,
        assigned_teacher_id: inlineForm.assigned_teacher_id ? parseInt(inlineForm.assigned_teacher_id) : null,
      })
      toast.success('Subject updated!')
      setInlineEdit(null)
      loadSubjects()
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed')
    } finally { setSaving(false) }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    const payload = {
      ...form,
      exam_id: parseInt(selectedExam),
      full_marks: parseInt(form.full_marks),
      pass_marks: parseInt(form.pass_marks),
      paper_group: form.paper_group || null,
      paper_number: form.paper_number ? parseInt(form.paper_number) : null,
      assigned_teacher_id: form.assigned_teacher_id ? parseInt(form.assigned_teacher_id) : null,
    }
    try {
      if (editingSubject) {
        await subjectsAPI.update(editingSubject.id, payload)
        toast.success('Subject updated!')
      } else {
        await subjectsAPI.create(payload)
        toast.success('Subject added!')
      }
      setShowForm(false)
      setEditingSubject(null)
      setForm(BLANK)
      loadSubjects()
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed')
    } finally { setSaving(false) }
  }

  const handleDelete = async (id) => {
    if (!confirm('Delete this subject? All marks will be lost.')) return
    try { await subjectsAPI.delete(id); toast.success('Deleted'); loadSubjects() }
    catch { toast.error('Cannot delete — marks may exist') }
  }

  const F = ({ children }) => <div className="form-group" style={{ margin: 0 }}>{children}</div>

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div><h1>Subjects</h1><p>Configure subjects and assign teachers per exam</p></div>
        <button className="btn btn-primary" onClick={openCreate} disabled={!selectedExam}>
          <Plus size={14} /> Add Subject
        </button>
      </div>

      {/* Exam selector */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="form-group" style={{ margin: 0 }}>
          <label className="form-label">Select Exam</label>
          <select className="form-control" value={selectedExam} onChange={e => { setSelectedExam(e.target.value); setShowForm(false); setInlineEdit(null) }}>
            <option value="">— Choose Exam —</option>
            {exams.map(ex => <option key={ex.id} value={ex.id}>{ex.college.name} — {ex.year} {ex.term} ({ex.group})</option>)}
          </select>
        </div>
      </div>

      {/* Add / Edit form */}
      {showForm && selectedExam && (
        <div className="card" style={{ marginBottom: 16, border: '1.5px solid var(--brand)' }}>
          <div className="card-header">
            <span className="card-title" style={{ color: 'var(--brand)' }}>
              {editingSubject ? '✏️ Edit Subject' : '➕ Add Subject'}
            </span>
            <button className="btn btn-ghost btn-sm btn-icon" onClick={() => { setShowForm(false); setEditingSubject(null) }}><X size={15} /></button>
          </div>
          <form onSubmit={handleSubmit}>
            <div className="form-row" style={{ marginBottom: 10 }}>
              <F><label className="form-label">Subject Name</label>
                <input type="text" className="form-control" value={form.name} onChange={e => { if (!isComposing) setForm(f => ({ ...f, name: e.target.value })) }} onCompositionStart={() => setIsComposing(true)} onCompositionEnd={e => { setIsComposing(false); setForm(f => ({ ...f, name: e.target.value })) }} placeholder="e.g. Physics" required />
              </F>
              <F><label className="form-label">Subject Code</label>
                <input type="text" className="form-control" value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value }))} placeholder="e.g. 174" required />
              </F>
            </div>
            <div className="form-row-3" style={{ marginBottom: 10 }}>
              <F><label className="form-label">Type</label>
                <select className="form-control" value={form.subject_type} onChange={e => setForm(f => ({ ...f, subject_type: e.target.value }))}>
                  <option value="mandatory">Mandatory</option>
                  <option value="optional">Optional (4th)</option>
                </select>
              </F>
              <F><label className="form-label">Paper Group</label>
                <input type="text" className="form-control" value={form.paper_group} onChange={e => setForm(f => ({ ...f, paper_group: e.target.value }))} placeholder="Shared group name" />
              </F>
              <F><label className="form-label">Paper Number</label>
                <input type="number" className="form-control" value={form.paper_number} onChange={e => setForm(f => ({ ...f, paper_number: e.target.value }))} placeholder="1 or 2" />
              </F>
            </div>
            <div className="form-row-3" style={{ marginBottom: 10 }}>
              <F><label className="form-label">Full Marks</label>
                <input type="number" className="form-control" value={form.full_marks} onChange={e => setForm(f => ({ ...f, full_marks: e.target.value }))} />
              </F>
              <F><label className="form-label">Pass Marks</label>
                <input type="number" className="form-control" value={form.pass_marks} onChange={e => setForm(f => ({ ...f, pass_marks: e.target.value }))} />
              </F>
              <F><label className="form-label">Assign Teacher</label>
                <select className="form-control" value={form.assigned_teacher_id} onChange={e => setForm(f => ({ ...f, assigned_teacher_id: e.target.value }))}>
                  <option value="">— No teacher assigned —</option>
                  {teachers.map(t => <option key={t.id} value={t.id}>{t.full_name} ({t.email})</option>)}
                </select>
              </F>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? <span className="spinner" style={{ width: 14, height: 14 }} /> : (editingSubject ? <Pencil size={14} /> : <Plus size={14} />)}
                {saving ? 'Saving...' : (editingSubject ? 'Update Subject' : 'Add Subject')}
              </button>
              <button type="button" className="btn btn-ghost" onClick={() => { setShowForm(false); setEditingSubject(null) }}>Cancel</button>
            </div>
          </form>
        </div>
      )}

      {/* Subjects table */}
      <div className="card">
        <div className="card-header">
          <span className="card-title">Subjects {selectedExam ? `(${subjects.length})` : ''}</span>
        </div>
        {!selectedExam ? (
          <div className="empty-state"><p>Select an exam to manage its subjects</p></div>
        ) : loading ? (
          <div style={{ textAlign: 'center', padding: '2rem' }}><span className="spinner" /></div>
        ) : subjects.length === 0 ? (
          <div className="empty-state"><p>No subjects added yet. Click "Add Subject".</p></div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>Name</th><th>Code</th><th>Type</th><th>Group</th><th>Paper</th><th>Full Marks</th><th>Pass Marks</th><th>Teacher</th><th>Actions</th></tr>
              </thead>
              <tbody>
                {subjects.map(s => (
                  inlineEdit === s.id ? (
                    // ── Inline edit row ──
                    <tr key={s.id} style={{ background: 'var(--brand-light)' }}>
                      <td>
                        <input type="text" className="form-control" style={{ padding: '4px 8px' }}
                          value={inlineForm.name} onChange={e => { if (!inlineIsComposing) setInlineForm(f => ({ ...f, name: e.target.value })) }} onCompositionStart={() => setInlineIsComposing(true)} onCompositionEnd={e => { setInlineIsComposing(false); setInlineForm(f => ({ ...f, name: e.target.value })) }} />
                      </td>
                      <td>
                        <input type="text" className="form-control" style={{ padding: '4px 8px', width: 70 }}
                          value={inlineForm.code} onChange={e => setInlineForm(f => ({ ...f, code: e.target.value }))} />
                      </td>
                      <td>
                        <select className="form-control" style={{ padding: '4px 8px' }}
                          value={inlineForm.subject_type} onChange={e => setInlineForm(f => ({ ...f, subject_type: e.target.value }))}>
                          <option value="mandatory">Mandatory</option>
                          <option value="optional">Optional</option>
                        </select>
                      </td>
                      <td>
                        <input type="text" className="form-control" style={{ padding: '4px 8px', width: 120 }}
                          value={inlineForm.paper_group} onChange={e => setInlineForm(f => ({ ...f, paper_group: e.target.value }))} placeholder="Group" />
                      </td>
                      <td>
                        <input type="number" className="form-control" style={{ padding: '4px 8px', width: 70 }}
                          value={inlineForm.paper_number} onChange={e => setInlineForm(f => ({ ...f, paper_number: e.target.value }))} placeholder="#" />
                      </td>
                      <td>
                        <input type="number" className="form-control" style={{ padding: '4px 8px', width: 70 }}
                          value={inlineForm.full_marks} onChange={e => setInlineForm(f => ({ ...f, full_marks: e.target.value }))} />
                      </td>
                      <td>
                        <input type="number" className="form-control" style={{ padding: '4px 8px', width: 70 }}
                          value={inlineForm.pass_marks} onChange={e => setInlineForm(f => ({ ...f, pass_marks: e.target.value }))} />
                      </td>
                      <td>
                        <select className="form-control" style={{ padding: '4px 8px', fontSize: 12 }}
                          value={inlineForm.assigned_teacher_id} onChange={e => setInlineForm(f => ({ ...f, assigned_teacher_id: e.target.value }))}>
                          <option value="">— None —</option>
                          {teachers.map(t => <option key={t.id} value={t.id}>{t.full_name}</option>)}
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
                      <td style={{ fontWeight: 500 }}>{s.name}</td>
                      <td><span className="badge badge-gray">{s.code}</span></td>
                      <td><span className={`badge ${s.subject_type === 'mandatory' ? 'badge-blue' : 'badge-amber'}`}>{s.subject_type}</span></td>
                      <td>{s.paper_group || '—'}</td>
                      <td>{s.paper_number || '—'}</td>
                      <td>{s.full_marks}</td>
                      <td>{s.pass_marks}</td>
                      <td style={{ color: 'var(--gray-400)', fontSize: 12 }}>{s.assigned_teacher?.full_name || '—'}</td>
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