from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from typing import List
from database import get_db
from auth import require_any, require_controller, get_current_user
from schemas import MarkCreate, MarkOut, MarkBulkCreate
from excel_utils import parse_marks_from_excel, parse_marks_from_csv, generate_marks_template_excel
from ocr_utils import parse_marks_from_ocr_file
from fastapi.responses import StreamingResponse
from io import BytesIO
import models

router = APIRouter(prefix="/api/marks", tags=["Marks"])


def ensure_marks_permission(subject: models.Subject, current_user: models.User):
    if current_user.role == models.UserRole.teacher and subject.assigned_teacher_id != current_user.id:
        raise HTTPException(403, "You can only manage marks for your assigned subject")


@router.get("/", response_model=List[MarkOut])
def list_marks(
    subject_id: int = None,
    exam_id: int = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_any)
):
    q = db.query(models.Mark)
    if subject_id:
        subject = db.query(models.Subject).get(subject_id)
        if not subject:
            raise HTTPException(404, "Subject not found")
        if current_user.role == models.UserRole.teacher and subject.assigned_teacher_id != current_user.id:
            raise HTTPException(403, "You can only view marks for your assigned subject")
        q = q.filter(models.Mark.subject_id == subject_id)
    if exam_id:
        q = q.join(models.Subject).filter(models.Subject.exam_id == exam_id)
        if current_user.role == models.UserRole.teacher:
            q = q.filter(models.Subject.assigned_teacher_id == current_user.id)
    return q.all()


@router.post("/", response_model=MarkOut, status_code=201)
def upsert_mark(
    payload: MarkCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_any)
):
    subject = db.query(models.Subject).get(payload.subject_id)
    if not subject:
        raise HTTPException(404, "Subject not found")
    ensure_marks_permission(subject, current_user)
    if payload.marks_obtained > subject.full_marks:
        raise HTTPException(400, f"Marks cannot exceed {subject.full_marks}")

    existing = db.query(models.Mark).filter(
        models.Mark.student_id == payload.student_id,
        models.Mark.subject_id == payload.subject_id
    ).first()

    if existing:
        existing.marks_obtained = payload.marks_obtained
        existing.entered_by = current_user.id
        db.commit()
        db.refresh(existing)
        return existing

    mark = models.Mark(
        student_id=payload.student_id,
        subject_id=payload.subject_id,
        marks_obtained=payload.marks_obtained,
        entered_by=current_user.id,
    )
    db.add(mark)
    db.commit()
    db.refresh(mark)
    return mark


@router.post("/bulk", status_code=201)
def bulk_upsert_marks(
    payload: MarkBulkCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_any)
):
    subject = db.query(models.Subject).get(payload.subject_id)
    if not subject:
        raise HTTPException(404, "Subject not found")
    ensure_marks_permission(subject, current_user)

    saved = 0
    errors = []

    for entry in payload.entries:
        student_id = entry.get("student_id")
        marks = entry.get("marks_obtained")

        if marks is None or marks < 0 or marks > subject.full_marks:
            errors.append(f"student_id {student_id}: invalid marks {marks}")
            continue

        student = db.query(models.Student).get(student_id)
        if not student:
            errors.append(f"student_id {student_id}: not found")
            continue

        existing = db.query(models.Mark).filter(
            models.Mark.student_id == student_id,
            models.Mark.subject_id == payload.subject_id
        ).first()

        if existing:
            existing.marks_obtained = marks
            existing.entered_by = current_user.id
        else:
            db.add(models.Mark(
                student_id=student_id,
                subject_id=payload.subject_id,
                marks_obtained=marks,
                entered_by=current_user.id,
            ))
        saved += 1

    db.commit()
    return {"saved": saved, "errors": errors}


@router.post("/import/excel")
async def import_marks_excel(
    subject_id: int = Form(...),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_any)
):
    """Import marks from teacher-submitted Excel file."""
    subject = db.query(models.Subject).get(subject_id)
    if not subject:
        raise HTTPException(404, "Subject not found")
    ensure_marks_permission(subject, current_user)

    content = await file.read()
    filename = file.filename.lower()

    if filename.endswith(".xlsx") or filename.endswith(".xls"):
        records, errors = parse_marks_from_excel(content)
    elif filename.endswith(".csv"):
        records, errors = parse_marks_from_csv(content)
    else:
        raise HTTPException(400, "Only .xlsx, .xls, .csv files are supported")

    # Match rolls to students and save
    exam_students = {
        s.roll: s for s in
        db.query(models.Student).filter(
            models.Student.exam_id == subject.exam_id,
            models.Student.is_active == True
        ).all()
    }

    saved = 0
    not_found_rolls = []

    for rec in records:
        roll = rec["roll"]
        marks = rec["marks"]
        student = exam_students.get(roll)

        if not student:
            not_found_rolls.append(roll)
            continue

        existing = db.query(models.Mark).filter(
            models.Mark.student_id == student.id,
            models.Mark.subject_id == subject_id
        ).first()

        if existing:
            existing.marks_obtained = marks
            existing.entered_by = current_user.id
        else:
            db.add(models.Mark(
                student_id=student.id,
                subject_id=subject_id,
                marks_obtained=marks,
                entered_by=current_user.id,
            ))
        saved += 1

    db.commit()
    return {
        "saved": saved,
        "parse_errors": errors,
        "not_found_rolls": not_found_rolls,
        "total_in_file": len(records)
    }


@router.post("/import/ocr")
async def import_marks_ocr(
    subject_id: int = Form(...),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_any)
):
    """Import marks from a scanned or photographed marksheet using OCR."""
    subject = db.query(models.Subject).get(subject_id)
    if not subject:
        raise HTTPException(404, "Subject not found")
    ensure_marks_permission(subject, current_user)

    content = await file.read()
    filename = file.filename.lower()
    records, errors = parse_marks_from_ocr_file(content, filename)

    exam_students = {
        s.roll: s for s in
        db.query(models.Student).filter(
            models.Student.exam_id == subject.exam_id,
            models.Student.is_active == True
        ).all()
    }

    saved = 0
    not_found_rolls = []

    for rec in records:
        roll = rec["roll"]
        marks = rec["marks"]
        student = exam_students.get(roll)

        if not student:
            not_found_rolls.append(roll)
            continue

        if marks < 0 or marks > subject.full_marks:
            errors.append(f"Roll {roll}: marks {marks} exceeds max {subject.full_marks}")
            continue

        existing = db.query(models.Mark).filter(
            models.Mark.student_id == student.id,
            models.Mark.subject_id == subject_id
        ).first()

        if existing:
            existing.marks_obtained = marks
            existing.entered_by = current_user.id
        else:
            db.add(models.Mark(
                student_id=student.id,
                subject_id=subject_id,
                marks_obtained=marks,
                entered_by=current_user.id,
            ))
        saved += 1

    db.commit()
    return {
        "saved": saved,
        "parse_errors": errors,
        "not_found_rolls": not_found_rolls,
        "total_in_file": len(records)
    }


@router.get("/template/excel")
def download_template(
    subject_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_any)
):
    """Download a blank Excel template for teacher mark submission."""
    subject = db.query(models.Subject).get(subject_id)
    if not subject:
        raise HTTPException(404, "Subject not found")
    ensure_marks_permission(subject, current_user)

    students = db.query(models.Student).filter(
        models.Student.exam_id == subject.exam_id,
        models.Student.is_active == True
    ).order_by(models.Student.roll).all()

    student_list = [{"roll": s.roll, "full_name": s.full_name} for s in students]
    excel_bytes = generate_marks_template_excel(subject.name, subject.code, student_list)

    filename = f"marks_template_{subject.name.replace(' ', '_')}.xlsx"
    return StreamingResponse(
        BytesIO(excel_bytes),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


@router.delete("/{mark_id}", status_code=204)
def delete_mark(
    mark_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_any)
):
    mark = db.query(models.Mark).get(mark_id)
    if not mark:
        raise HTTPException(404, "Mark not found")
    subject = db.query(models.Subject).get(mark.subject_id)
    if subject:
        ensure_marks_permission(subject, current_user)
    db.delete(mark)
    db.commit()
