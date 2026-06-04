import { useEffect, useState, useRef } from 'react'
import { examsAPI, subjectsAPI, studentsAPI, marksAPI } from '../services/api'
import { Save, Upload, Download, CheckCircle2, AlertCircle } from 'lucide-react'
import toast from 'react-hot-toast'

function getGrade(marks) {
  if (marks >= 80) return { letter: 'A+', cls: 'grade-aplus', gpa: 5.0 }
  if (marks >= 70) return { letter: 'A', cls: 'grade-a', gpa: 4.0 }
  if (marks >= 60) return { letter: 'A-', cls: 'grade-aminus', gpa: 3.5 }
  if (marks >= 50) return { letter: 'B', cls: 'grade-b', gpa: 3.0 }
  if (marks >= 40) return { letter: 'C', cls: 'grade-c', gpa: 2.0 }
  if (marks >= 33) return { letter: 'D', cls: 'grade-d', gpa: 1.0 }
  return { letter: 'F', cls: 'grade-f', gpa: 0.0 }
}

export default function MarksPage() {
  const [exams, setExams] = useState([])
  const [selectedExam, setSelectedExam] = useState('')
  const [subjects, setSubjects] = useState([])
  const [selectedSubject, setSelectedSubject] = useState('')
  const [students, setStudents] = useState([])
  const [marksMap, setMarksMap] = useState({})   // {student_id: marks}
  const [savedMap, setSavedMap] = useState({})   // {student_id: marks} — last saved
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [importLoading, setImportLoading] = useState(false)
  const [importResult, setImportResult] = useState(null)
  const fileRef = useRef()

  // Load exams
  useEffect(() => {
    examsAPI.list().then(r => setExams(r.data)).catch(() => {})
  }, [])

  // Load subjects when exam changes
  useEffect(() => {
    if (!selectedExam) { setSubjects([]); setSelectedSubject(''); return }
    subjectsAPI.list(selectedExam).then(r => {
      setSubjects(r.data)
      if (r.data.length > 0) setSelectedSubject(r.data[0].id)
    }).catch(() => {})
  }, [selectedExam])

  // Load students + existing marks when subject changes
  useEffect(() => {
    if (!selectedExam || !selectedSubject) { setStudents([]); setMarksMap({}); return }
    setLoading(true)
    Promise.all([
      studentsAPI.list(selectedExam),
      marksAPI.list(selectedSubject)
    ]).then(([sRes, mRes]) => {
      setStudents(sRes.data)
      const mMap = {}
      const sMap = {}
      mRes.data.forEach(m => {
        mMap[m.student_id] = m.marks_obtained
        sMap[m.student_id] = m.marks_obtained
      })
      setMarksMap(mMap)
      setSavedMap(sMap)
    }).catch(() => toast.error('Failed to load data'))
      .finally(() => setLoading(false))
  }, [selectedExam, selectedSubject])

  const handleMarkChange = (studentId, value) => {
    setMarksMap(prev => ({ ...prev, [studentId]: value === '' ? '' : Number(value) }))
  }

  const handleSaveAll = async () => {
    setSaving(true)
    const entries = students
      .filter(s => marksMap[s.id] !== '' && marksMap[s.id] !== undefined)
      .map(s => ({ student_id: s.id, marks_obtained: Number(marksMap[s.id]) }))

    try {
      const res = await marksAPI.bulkUpsert(parseInt(selectedSubject), entries)
      setSavedMap({ ...marksMap })
      toast.success(`✅ Saved ${res.data.saved} marks${res.data.errors?.length ? ` (${res.data.errors.length} errors)` : ''}`)
    } catch (err) {
      toast.error('Failed to save marks')
    } finally { setSaving(false) }
  }

  const handleImport = async (e) => {
    const file = e.target.files[0]
    if (!file || !selectedSubject) return
    setImportLoading(true)
    setImportResult(null)

    const imageExtensions = ['.png', '.jpg', '.jpeg', '.pdf']
    const lowerName = file.name.toLowerCase()
    const isOCRFile = imageExtensions.some(ext => lowerName.endsWith(ext))

    try {
      const res = isOCRFile
        ? await marksAPI.importOCR(parseInt(selectedSubject), file)
        : await marksAPI.importExcel(parseInt(selectedSubject), file)

      setImportResult(res.data)
      toast.success(`Imported ${res.data.saved} marks from file!`)
      const mRes = await marksAPI.list(selectedSubject)
      const mMap = {}
      mRes.data.forEach(m => { mMap[m.student_id] = m.marks_obtained })
      setMarksMap(mMap)
      setSavedMap({ ...mMap })
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Import failed')
    } finally {
      setImportLoading(false)
      e.target.value = ''
    }
  }

  const currentSubject = subjects.find(s => s.id === parseInt(selectedSubject))
  const dirty = students.some(s => marksMap[s.id] !== savedMap[s.id])
  const filledCount = students.filter(s => marksMap[s.id] !== '' && marksMap[s.id] !== undefined).length

  return (
    <div>
      <div className="page-header">
        <h1>Mark Entry</h1>
        <p>Enter or import student marks per subject</p>
      </div>

      {/* Selectors */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="form-row">
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">Select Exam</label>
            <select className="form-control" value={selectedExam} onChange={e => setSelectedExam(e.target.value)}>
              <option value="">— Choose Exam —</option>
              {exams.map(ex => (
                <option key={ex.id} value={ex.id}>{ex.college.name} — {ex.year} {ex.term} ({ex.group})</option>
              ))}
            </select>
          </div>
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">Select Subject</label>
            <select className="form-control" value={selectedSubject} onChange={e => setSelectedSubject(e.target.value)} disabled={!selectedExam}>
              <option value="">— Choose Subject —</option>
              {subjects.map(s => (
                <option key={s.id} value={s.id}>{s.name} ({s.code}) — {s.subject_type}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {selectedSubject && (
        <>
          {/* Import toolbar */}
          <div className="card" style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              <div style={{ flex: 1 }}>
                <span style={{ fontWeight: 600, fontSize: 14 }}>{currentSubject?.name}</span>
                <span style={{ fontSize: 12, color: 'var(--gray-400)', marginLeft: 8 }}>
                  Code: {currentSubject?.code} &nbsp;|&nbsp; {filledCount}/{students.length} filled
                </span>
                {dirty && <span className="badge badge-amber" style={{ marginLeft: 8 }}>Unsaved changes</span>}
              </div>
              <input type="file" ref={fileRef} accept=".xlsx,.xls,.csv,.png,.jpg,.jpeg,.pdf" style={{ display: 'none' }} onChange={handleImport} />
              <a
                href={marksAPI.downloadTemplate(selectedSubject)}
                className="btn btn-ghost btn-sm"
                download
              >
                <Download size={14} /> Download Template
              </a>
              <button
                className="btn btn-outline btn-sm"
                onClick={() => fileRef.current?.click()}
                disabled={importLoading}
              >
                {importLoading ? <span className="spinner" style={{ width: 13, height: 13 }} /> : <Upload size={14} />}
                Import Marksheet / Spreadsheet
              </button>
              <button
                className="btn btn-primary"
                onClick={handleSaveAll}
                disabled={saving || filledCount === 0}
              >
                {saving ? <span className="spinner" style={{ width: 14, height: 14 }} /> : <Save size={14} />}
                {saving ? 'Saving...' : 'Save All Marks'}
              </button>
            </div>

            {/* Import result */}
            {importResult && (
              <div style={{ marginTop: 12 }}>
                <div className="alert alert-success">
                  ✅ Imported {importResult.saved} of {importResult.total_in_file} records
                  {importResult.not_found_rolls?.length > 0 && (
                    <span style={{ marginLeft: 8 }}>
                      | ⚠️ Rolls not found: {importResult.not_found_rolls.join(', ')}
                    </span>
                  )}
                </div>
                {importResult.parse_errors?.length > 0 && (
                  <div className="alert alert-error" style={{ marginTop: 6 }}>
                    {importResult.parse_errors.slice(0, 3).join(' | ')}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Marks table */}
          <div className="card">
            {loading ? (
              <div style={{ textAlign: 'center', padding: '2rem' }}><span className="spinner" /></div>
            ) : students.length === 0 ? (
              <div className="empty-state"><p>No students found for this exam. Add students first.</p></div>
            ) : (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Roll</th>
                      <th>Student Name</th>
                      <th style={{ width: 130 }}>Marks (/100)</th>
                      <th style={{ width: 80 }}>Grade</th>
                      <th style={{ width: 60 }}>GPA</th>
                      <th style={{ width: 60 }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {students.map(student => {
                      const m = marksMap[student.id]
                      const hasMarks = m !== '' && m !== undefined && m !== null
                      const grade = hasMarks ? getGrade(Number(m)) : null
                      const isDirty = marksMap[student.id] !== savedMap[student.id]

                      return (
                        <tr key={student.id}>
                          <td>
                            <span style={{ fontWeight: 600, color: 'var(--brand)' }}>{student.roll}</span>
                          </td>
                          <td style={{ fontWeight: 500 }}>
                            {student.full_name}
                            {isDirty && <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--warning)', display: 'inline-block', marginLeft: 6 }} />}
                          </td>
                          <td>
                            <input
                              type="number"
                              min="0"
                              max="100"
                              step="0.5"
                              className="form-control"
                              style={{ padding: '5px 8px', fontSize: 13, width: '100%' }}
                              value={m !== undefined ? m : ''}
                              placeholder="—"
                              onChange={e => handleMarkChange(student.id, e.target.value)}
                            />
                          </td>
                          <td>
                            {grade && <span className={grade.cls} style={{ fontSize: 15 }}>{grade.letter}</span>}
                          </td>
                          <td style={{ color: 'var(--gray-600)' }}>
                            {grade && grade.gpa.toFixed(2)}
                          </td>
                          <td>
                            {hasMarks && (
                              grade?.letter === 'F'
                                ? <AlertCircle size={16} style={{ color: 'var(--danger)' }} />
                                : <CheckCircle2 size={16} style={{ color: 'var(--brand)' }} />
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {!selectedExam && (
        <div className="empty-state card" style={{ padding: '3rem' }}>
          <p style={{ fontSize: 15 }}>👆 Select an exam and subject above to start entering marks</p>
        </div>
      )}
    </div>
  )
}
