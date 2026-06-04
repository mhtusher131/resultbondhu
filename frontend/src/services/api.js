import axios from 'axios'

const BASE_URL = import.meta.env.VITE_API_URL || window.location.origin

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
})

// Attach token
api.interceptors.request.use(cfg => {
  const token = localStorage.getItem('rb_token')
  if (token) cfg.headers.Authorization = `Bearer ${token}`
  return cfg
})

// Handle 401
api.interceptors.response.use(
  r => r,
  err => {
    if (err.response?.status === 401) {
      localStorage.removeItem('rb_token')
      localStorage.removeItem('rb_user')
      window.location.href = '/login'
    }
    return Promise.reject(err)
  }
)

export default api

// ── Auth ──────────────────────────────────────────────
export const authAPI = {
  login: (email, password) => api.post('/api/auth/login', { email, password }),
  register: (data) => api.post('/api/auth/register', data),
  me: () => api.get('/api/auth/me'),
}

// ── Users ──────────────────────────────────────────────
export const usersAPI = {
  list: () => api.get('/api/users/'),
  create: (data) => api.post('/api/users/', data),
  update: (id, data) => api.patch(`/api/users/${id}`, data),
  delete: (id) => api.delete(`/api/users/${id}`),
}

// ── Colleges ──────────────────────────────────────────
export const collegesAPI = {
  list: () => api.get('/api/colleges'),
  create: (data) => api.post('/api/colleges', data),
  update: (id, data) => api.patch(`/api/colleges/${id}`, data),
}

// ── Exams ──────────────────────────────────────────────
export const examsAPI = {
  list: () => api.get('/api/exams'),
  create: (data) => api.post('/api/exams', data),
  get: (id) => api.get(`/api/exams/${id}`),
  update: (id, data) => api.patch(`/api/exams/${id}`, data),  // ← ADD THIS
  publish: (id) => api.patch(`/api/exams/${id}/publish`),
  delete: (id) => api.delete(`/api/exams/${id}`),
}

// ── Subjects ──────────────────────────────────────────
export const subjectsAPI = {
  list: (examId) => api.get('/api/subjects', { params: { exam_id: examId } }),
  create: (data) => api.post('/api/subjects', data),
  update: (id, data) => api.patch(`/api/subjects/${id}`, data),
  delete: (id) => api.delete(`/api/subjects/${id}`),
}

// ── Students ──────────────────────────────────────────
export const studentsAPI = {
  list: (examId) => api.get('/api/students', { params: { exam_id: examId } }),
  create: (data) => api.post('/api/students', data),
  bulkCreate: (examId, students) => api.post('/api/students/bulk', { exam_id: examId, students }),
  update: (id, data) => api.patch(`/api/students/${id}`, data),
  delete: (id) => api.delete(`/api/students/${id}`),
  deleteAll: (examId) => api.delete('/api/students', { params: { exam_id: examId } }),
}

// ── Marks ──────────────────────────────────────────────
export const marksAPI = {
  list: (subjectId) => api.get('/api/marks/', { params: { subject_id: subjectId } }),
  upsert: (data) => api.post('/api/marks/', data),
  bulkUpsert: (subjectId, entries) => api.post('/api/marks/bulk', { subject_id: subjectId, entries }),
  importExcel: (subjectId, file) => {
    const form = new FormData()
    form.append('subject_id', subjectId)
    form.append('file', file)
    return api.post('/api/marks/import/excel', form, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
  },
  importOCR: (subjectId, file) => {
    const form = new FormData()
    form.append('subject_id', subjectId)
    form.append('file', file)
    return api.post('/api/marks/import/ocr', form, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
  },
  downloadTemplate: (subjectId) =>
    `${BASE_URL}/api/marks/template/excel?subject_id=${subjectId}`,
}

// ── Results ──────────────────────────────────────────
export const resultsAPI = {
  get: (examId) => api.get(`/api/results/${examId}`),
  getStudent: (examId, roll) => api.get(`/api/results/${examId}/student/${roll}`),
  exportPDF: (examId) => api.get(`/api/results/${examId}/export/pdf`, { responseType: 'blob' }),
  exportStudentPDF: (examId, roll) => api.get(`/api/results/${examId}/student/${roll}/export/pdf`, { responseType: 'blob' }),
  exportExcel: (examId) => api.get(`/api/results/${examId}/export/excel`, { responseType: 'blob' }),
  whatsapp: (examId) => api.get(`/api/results/${examId}/whatsapp-summary`),
}
