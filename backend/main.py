from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database import create_tables
from routes.auth_routes import router as auth_router
from routes.user_routes import router as user_router
from routes.exam_routes import router as exam_router
from routes.subject_student_routes import router as subj_student_router
from routes.marks_routes import router as marks_router
from routes.results_routes import router as results_router
from auth import hash_password
from database import SessionLocal
import models
import os
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(
    title="ResultBondhu API",
    description="HSC College Exam Result & GPA Management System",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# CORS — allow React frontend
# app.add_middleware(
#     CORSMiddleware,
#     allow_origins=["http://localhost:5173", "http://localhost:3000", "*"],
#     allow_credentials=True,
#     allow_methods=["*"],
#     allow_headers=["*"],
# )
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "https://your-vercel-app.vercel.app"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
# Register all routers
app.include_router(auth_router)
app.include_router(user_router)
app.include_router(exam_router)
app.include_router(subj_student_router)
app.include_router(marks_router)
app.include_router(results_router)


@app.on_event("startup")
def startup():
    create_tables()
    # Seed default admin user if no users exist
    db = SessionLocal()
    try:
        if db.query(models.User).count() == 0:
            admin = models.User(
                full_name="System Admin",
                email="admin@resultbondhu.com",
                hashed_password=hash_password("admin123"),
                role=models.UserRole.admin,
            )
            db.add(admin)

            # Seed default college
            college = models.College(
                name="Dhaka City College",
                eiin="108234",
                address="Dhaka, Bangladesh",
                principal_name="Principal Name",
            )
            db.add(college)
            db.commit()
            print("✅ Seeded default admin: admin@resultbondhu.com / admin123")
            print("✅ Seeded default college: Dhaka City College")
    finally:
        db.close()


@app.get("/")
def root():
    return {
        "app": "ResultBondhu",
        "version": "1.0.0",
        "description": "HSC College Exam Result & GPA Management System",
        "docs": "/docs",
    }


@app.get("/health")
def health():
    return {"status": "ok"}
