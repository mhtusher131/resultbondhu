# 📋 ResultBondhu — রেজাল্ট বন্ধু

**HSC College Exam Result & GPA Management System**

A production-grade web application for Bangladeshi HSC college exam controllers to manage student marks, merge subject results from multiple teachers, and auto-generate grade sheets with GPA.

---

## ✨ Features

| Feature | Description |
|---|---|
| 🔐 Role-based Auth | Admin / Controller / Teacher login with JWT |
| 📚 Exam Management | Create exams per year, term, group |
| 👨‍🎓 Student Management | Add students by roll, bulk import via CSV |
| 📖 Subject Config | Add subjects, assign teachers, set mandatory/optional |
| ✏️ Mark Entry | Enter marks per subject with live grade preview |
| 📤 Excel/CSV Import | Teachers submit marks via Excel — controller imports |
| 📥 Template Download | Auto-generate mark entry template for each teacher |
| 🏆 GPA Calculation | Official Bangladesh HSC grading (A+ = 5.00 to F = 0.00) |
| 📄 PDF Export | Professional grade sheet PDF with college letterhead |
| 📊 Excel Export | Full result sheet downloadable as .xlsx |
| 💬 WhatsApp Summary | One-click formatted result text to copy and send |
| 📈 Result Dashboard | Pass rate, avg GPA, A+ count, distribution chart |

---

## 🚀 Quick Start (Docker — Recommended for College PC)

### Requirements
- [Docker Desktop](https://www.docker.com/products/docker-desktop) installed

### Windows
```
Double-click: start.bat
```

### Linux / Mac
```bash
chmod +x start.sh
./start.sh
```

### Open in browser
```
http://localhost
```

### Default login
```
Email:    admin@resultbondhu.com
Password: admin123
```

---

## 🛠️ Manual Development Setup

### Backend (FastAPI + PostgreSQL)

```bash
cd backend

# Install Python dependencies
pip install -r requirements.txt

# For OCR marksheet import, also install system OCR dependencies:
# Ubuntu/Debian:
# sudo apt-get install -y tesseract-ocr poppler-utils
# macOS (Homebrew):
# brew install tesseract poppler

# Configure .env
DATABASE_URL=postgresql://user:pass@localhost:5432/resultbondhu
SECRET_KEY=your-secret-key
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=480

# Run
nuvicorn main:app --reload --port 8000
```

**API Docs:** `http://localhost:8000/docs`

### Frontend (React + Vite)

```bash
cd frontend

# Install
npm install

# Set API URL in .env
VITE_API_URL=http://localhost:8000

# Run dev server
npm run dev
```

**App:** `http://localhost:5173`

---

## 🔄 Workflow for Exam Controller

```
1. SETUP
   Admin → Create College → Create Exam → Add Subjects → Add Students

2. DISTRIBUTE TO TEACHERS
   Marks → Download Template (Excel) → Share with subject teacher

3. COLLECT MARKS
   Teachers fill the Excel and send back (WhatsApp / email)

4. IMPORT MARKS
   Marks → Import Excel/CSV → Select subject → Upload → Done

5. GENERATE RESULTS
   Results → Select Exam → View GPA → Export PDF / Excel / WhatsApp

```

---

## 📁 Project Structure

```
resultbondhu/
├── backend/
│   ├── main.py              # FastAPI app + startup
│   ├── models.py            # SQLAlchemy ORM models
│   ├── schemas.py           # Pydantic request/response schemas
│   ├── database.py          # DB connection (supports PostgreSQL + SQLite)
│   ├── auth.py              # JWT auth + role guards
│   ├── grading.py           # Bangladesh HSC GPA calculation
│   ├── pdf_generator.py     # ReportLab PDF grade sheet
│   ├── excel_utils.py       # openpyxl import/export
│   ├── routes/
│   │   ├── auth_routes.py
│   │   ├── user_routes.py
│   │   ├── exam_routes.py
│   │   ├── subject_student_routes.py
│   │   ├── marks_routes.py
│   │   └── results_routes.py
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── App.jsx
│   │   ├── index.css
│   │   ├── context/AuthContext.jsx
│   │   ├── services/api.js
│   │   ├── components/Layout.jsx
│   │   └── pages/
│   │       ├── LoginPage.jsx
│   │       ├── Dashboard.jsx
│   │       ├── ExamsPage.jsx
│   │       ├── StudentsPage.jsx
│   │       ├── SubjectsPage.jsx
│   │       ├── MarksPage.jsx
│   │       ├── ResultsPage.jsx
│   │       └── UsersPage.jsx
│   ├── nginx.conf
│   └── Dockerfile
├── docker-compose.yml       # PostgreSQL + Backend + Frontend
├── start.bat                # Windows one-click launcher
└── start.sh                 # Linux/Mac launcher
```

---

## 🎓 HSC GPA Scale (Bangladesh)

| Marks | Grade | GPA |
|-------|-------|-----|
| 80–100 | A+ | 5.00 |
| 70–79 | A | 4.00 |
| 60–69 | A- | 3.50 |
| 50–59 | B | 3.00 |
| 40–49 | C | 2.00 |
| 33–39 | D | 1.00 |
| 0–32 | F | 0.00 |

Optional 4th subject improves GPA only if it raises the average.

---

## 🔌 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/auth/login | Login → JWT token |
| GET | /api/auth/me | Current user |
| GET | /api/exams | List all exams |
| POST | /api/exams | Create exam |
| GET | /api/subjects?exam_id= | Subjects per exam |
| GET | /api/students?exam_id= | Students per exam |
| POST | /api/students/bulk | Bulk add students |
| POST | /api/marks/bulk | Save marks for subject |
| POST | /api/marks/import/excel | Import Excel file |
| GET | /api/marks/template/excel?subject_id= | Download template |
| GET | /api/results/{exam_id} | Full result with GPA |
| GET | /api/results/{exam_id}/export/pdf | Download PDF |
| GET | /api/results/{exam_id}/export/excel | Download Excel |
| GET | /api/results/{exam_id}/whatsapp-summary | WA text |

Full interactive docs: `http://localhost:8000/docs`

---

## 🔐 User Roles

| Role | Permissions |
|------|-------------|
| **Admin** | Full access — manage users, colleges, all data |
| **Controller** | Create exams, subjects, students, import marks, export results |
| **Teacher** | Enter marks for assigned subjects only |

---

## 🛡️ Security Notes for Production

1. Change `SECRET_KEY` in `.env` to a long random string
2. Change `POSTGRES_PASSWORD` in `docker-compose.yml`
3. Set `CORS` origins to your specific domain
4. Restrict port 5432 (PostgreSQL) from public access
5. Use HTTPS with a reverse proxy (Nginx + certbot) if network-facing

---

Built with ❤️ for Bangladeshi HSC exam controllers.
