from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload
from typing import List
from database import get_db
from auth import require_controller, require_any
from schemas import SubjectCreate, SubjectOut, StudentCreate, StudentOut, StudentBulkCreate
import models

router = APIRouter(tags=["Subjects & Students"])


# ── Subject ───────────────────────────────────────────

@router.get("/api/subjects", response_model=List[SubjectOut])
def list_subjects(
    exam_id: int = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_any)
):
    q = db.query(models.Subject).options(joinedload(models.Subject.assigned_teacher))
    if exam_id:
        q = q.filter(models.Subject.exam_id == exam_id)
    if current_user.role == models.UserRole.teacher:
        q = q.filter(models.Subject.assigned_teacher_id == current_user.id)
    return q.all()


@router.post("/api/subjects", response_model=SubjectOut, status_code=201)
def create_subject(
    payload: SubjectCreate,
    db: Session = Depends(get_db),
    _=Depends(require_controller)
):
    data = payload.model_dump()
    # Normalize code and name
    if data.get('code'):
        data['code'] = data['code'].strip().upper()
    if data.get('name'):
        data['name'] = data['name'].strip()

    subject = models.Subject(**data)
    db.add(subject)
    db.commit()
    db.refresh(subject)
    return db.query(models.Subject).options(joinedload(models.Subject.assigned_teacher)).get(subject.id)


@router.patch("/api/subjects/{subject_id}", response_model=SubjectOut)
def update_subject(
    subject_id: int,
    payload: SubjectCreate,
    db: Session = Depends(get_db),
    _=Depends(require_controller)
):
    subj = db.query(models.Subject).get(subject_id)
    if not subj:
        raise HTTPException(404, "Subject not found")
    updates = payload.model_dump(exclude_none=True)
    # Normalize incoming values
    if 'code' in updates and updates.get('code'):
        updates['code'] = updates['code'].strip().upper()
    if 'name' in updates and updates.get('name'):
        updates['name'] = updates['name'].strip()

    for k, v in updates.items():
        setattr(subj, k, v)
    db.commit()
    db.refresh(subj)
    return subj


@router.delete("/api/subjects/{subject_id}", status_code=204)
def delete_subject(
    subject_id: int,
    db: Session = Depends(get_db),
    _=Depends(require_controller)
):
    subj = db.query(models.Subject).get(subject_id)
    if not subj:
        raise HTTPException(404, "Subject not found")
    db.delete(subj)
    db.commit()


# ── Student ───────────────────────────────────────────

@router.get("/api/students", response_model=List[StudentOut])
def list_students(
    exam_id: int = None,
    db: Session = Depends(get_db),
    _=Depends(require_any)
):
    q = db.query(models.Student).filter(models.Student.is_active == True)
    if exam_id:
        q = q.filter(models.Student.exam_id == exam_id)
    return q.order_by(models.Student.roll).all()


@router.post("/api/students", response_model=StudentOut, status_code=201)
def create_student(
    payload: StudentCreate,
    db: Session = Depends(get_db),
    _=Depends(require_controller)
):
    student = models.Student(**payload.model_dump())
    db.add(student)
    db.commit()
    db.refresh(student)
    return student


@router.post("/api/students/bulk", status_code=201)
def bulk_create_students(
    payload: StudentBulkCreate,
    db: Session = Depends(get_db),
    _=Depends(require_controller)
):
    created = 0
    skipped = 0
    for s in payload.students:
        existing = db.query(models.Student).filter(
            models.Student.exam_id == s.exam_id,
            models.Student.roll == s.roll
        ).first()
        if existing:
            # If an existing active student exists, skip to avoid duplicates.
            if existing.is_active:
                skipped += 1
                continue
            # If an existing inactive student exists (soft-deleted), reactivate and update fields.
            for k, v in s.model_dump().items():
                setattr(existing, k, v)
            existing.is_active = True
            db.add(existing)
            created += 1
            continue
        student = models.Student(**s.model_dump())
        db.add(student)
        created += 1
    db.commit()
    return {"created": created, "skipped": skipped}


@router.patch("/api/students/{student_id}", response_model=StudentOut)
def update_student(
    student_id: int,
    payload: StudentCreate,
    db: Session = Depends(get_db),
    _=Depends(require_controller)
):
    student = db.query(models.Student).get(student_id)
    if not student:
        raise HTTPException(404, "Student not found")
    for k, v in payload.model_dump(exclude_none=True).items():
        setattr(student, k, v)
    db.commit()
    db.refresh(student)
    return student


@router.delete("/api/students/{student_id}", status_code=204)
def delete_student(
    student_id: int,
    db: Session = Depends(get_db),
    _=Depends(require_controller)
):
    student = db.query(models.Student).get(student_id)
    if not student:
        raise HTTPException(404, "Student not found")
    student.is_active = False
    db.commit()


@router.delete("/api/students", status_code=204)
def delete_all_students(
    exam_id: int = None,
    db: Session = Depends(get_db),
    _=Depends(require_controller)
):
    """Mark all students for an exam as inactive (soft delete). Requires `exam_id` query param."""
    if not exam_id:
        raise HTTPException(400, "exam_id required")
    q = db.query(models.Student).filter(models.Student.exam_id == exam_id)
    q.update({"is_active": False})
    db.commit()
