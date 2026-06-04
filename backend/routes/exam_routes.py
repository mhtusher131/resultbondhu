from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload
from typing import List
from database import get_db
from auth import require_controller, require_any, get_current_user
from schemas import CollegeCreate, CollegeOut, ExamCreate, ExamOut
import models

router = APIRouter(tags=["Colleges & Exams"])


# ── College ───────────────────────────────────────────

@router.get("/api/colleges", response_model=List[CollegeOut])
def list_colleges(
    db: Session = Depends(get_db),
    _: models.User = Depends(require_any)
):
    return db.query(models.College).all()


@router.post("/api/colleges", response_model=CollegeOut, status_code=201)
def create_college(
    payload: CollegeCreate,
    db: Session = Depends(get_db),
    _: models.User = Depends(require_controller)
):
    college = models.College(**payload.model_dump())
    db.add(college)
    db.commit()
    db.refresh(college)
    return college


@router.get("/api/colleges/{college_id}", response_model=CollegeOut)
def get_college(college_id: int, db: Session = Depends(get_db), _=Depends(require_any)):
    college = db.query(models.College).get(college_id)
    if not college:
        raise HTTPException(404, "College not found")
    return college


@router.patch("/api/colleges/{college_id}", response_model=CollegeOut)
def update_college(
    college_id: int,
    payload: CollegeCreate,
    db: Session = Depends(get_db),
    _=Depends(require_controller)
):
    college = db.query(models.College).get(college_id)
    if not college:
        raise HTTPException(404, "College not found")
    for k, v in payload.model_dump(exclude_none=True).items():
        setattr(college, k, v)
    db.commit()
    db.refresh(college)
    return college


# ── Exam ──────────────────────────────────────────────

@router.get("/api/exams", response_model=List[ExamOut])
def list_exams(
    db: Session = Depends(get_db),
    _: models.User = Depends(require_any)
):
    return (
        db.query(models.Exam)
        .options(joinedload(models.Exam.college))
        .all()
    )


@router.post("/api/exams", response_model=ExamOut, status_code=201)
def create_exam(
    payload: ExamCreate,
    db: Session = Depends(get_db),
    _: models.User = Depends(require_controller)
):
    college = db.query(models.College).get(payload.college_id)
    if not college:
        raise HTTPException(404, "College not found")
    exam = models.Exam(**payload.model_dump())
    db.add(exam)
    db.commit()
    db.refresh(exam)
    return db.query(models.Exam).options(joinedload(models.Exam.college)).get(exam.id)


@router.get("/api/exams/{exam_id}", response_model=ExamOut)
def get_exam(exam_id: int, db: Session = Depends(get_db), _=Depends(require_any)):
    exam = (
        db.query(models.Exam)
        .options(joinedload(models.Exam.college))
        .filter(models.Exam.id == exam_id)
        .first()
    )
    if not exam:
        raise HTTPException(404, "Exam not found")
    return exam

@router.patch("/api/exams/{exam_id}", response_model=ExamOut)
def update_exam(
    exam_id: int,
    payload: ExamCreate,
    db: Session = Depends(get_db),
    _=Depends(require_controller)
):
    exam = db.query(models.Exam).options(joinedload(models.Exam.college)).filter(models.Exam.id == exam_id).first()
    if not exam:
        raise HTTPException(404, "Exam not found")
    for k, v in payload.model_dump(exclude_none=True).items():
        setattr(exam, k, v)
    db.commit()
    db.refresh(exam)
    return db.query(models.Exam).options(joinedload(models.Exam.college)).filter(models.Exam.id == exam_id).first()



@router.patch("/api/exams/{exam_id}/publish")
def publish_exam(
    exam_id: int,
    db: Session = Depends(get_db),
    _=Depends(require_controller)
):
    exam = db.query(models.Exam).get(exam_id)
    if not exam:
        raise HTTPException(404, "Exam not found")
    exam.is_published = True
    db.commit()
    return {"message": "Exam published successfully"}


@router.delete("/api/exams/{exam_id}", status_code=204)
def delete_exam(
    exam_id: int,
    db: Session = Depends(get_db),
    _=Depends(require_controller)
):
    exam = db.query(models.Exam).get(exam_id)
    if not exam:
        raise HTTPException(404, "Exam not found")
    db.delete(exam)
    db.commit()
