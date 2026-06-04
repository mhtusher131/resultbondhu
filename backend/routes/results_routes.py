from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session, joinedload
from database import get_db
from auth import require_any
from schemas import ExamResultSummary, StudentResult, SubjectResult, ExamOut, CollegeOut
from grading import get_grade, calculate_gpa
from pdf_generator import generate_grade_sheet_pdf, generate_student_result_pdf
from excel_utils import generate_result_excel
from io import BytesIO
import models

router = APIRouter(prefix="/api/results", tags=["Results"])


def normalize_subject_key(value: str) -> str:
    if not value:
        return ""
    key = value.strip().lower()
    for ch in ["/", "\\", "-", "_", ".", ","]:
        key = key.replace(ch, " ")
    return " ".join(key.split())


def subject_matches_optional(subject, selected_optional: str) -> bool:
    if not selected_optional:
        return False
    selected_key = normalize_subject_key(selected_optional)
    name_key = normalize_subject_key(subject.name)
    code_key = normalize_subject_key(subject.code)

    if selected_key == name_key or selected_key == code_key:
        return True
    if name_key and name_key in selected_key:
        return True
    if code_key and code_key in selected_key:
        return True

    # Common optional subjects in HSC science
    if "biology" in selected_key and "biology" in name_key:
        return True
    if ("higher" in selected_key and "math" in selected_key) and ("higher" in name_key and "math" in name_key):
        return True
    if selected_key == "bm" and "biology" in name_key:
        return True
    if selected_key == "hm" and "higher" in name_key and "math" in name_key:
        return True

    return False


def is_optional_subject(subject) -> bool:
    if subject.subject_type.value == "optional":
        return True

    norm = f"{subject.name} {subject.code}".lower()
    return any(keyword in norm for keyword in ["4th", "fourth", "optional"])


def is_subject_optional_for_student(subject, selected_optional: str) -> bool:
    if selected_optional:
        return subject_matches_optional(subject, selected_optional)
    return is_optional_subject(subject)


def build_exam_results(exam_id: int, db: Session) -> ExamResultSummary:
    exam = (
        db.query(models.Exam)
        .options(joinedload(models.Exam.college))
        .filter(models.Exam.id == exam_id)
        .first()
    )
    if not exam:
        raise HTTPException(404, "Exam not found")

    subjects = db.query(models.Subject).filter(models.Subject.exam_id == exam_id).all()
    students = (
        db.query(models.Student)
        .filter(models.Student.exam_id == exam_id, models.Student.is_active == True)
        .order_by(models.Student.roll)
        .all()
    )

    # Load all marks for this exam at once
    all_marks = (
        db.query(models.Mark)
        .join(models.Subject)
        .filter(models.Subject.exam_id == exam_id)
        .all()
    )
    # Build lookup: {(student_id, subject_id): marks_obtained}
    marks_lookup = {(m.student_id, m.subject_id): m.marks_obtained for m in all_marks}

    results = []
    for student in students:
        subject_results = []
        grade_inputs = []

        # Determine this student's selected optional subject (if any).
        selected_optional = student.optional_subject or ""

        # Group paper subjects for test exams using paper_group.
        grouped_subjects = {}
        for subj in subjects:
            if exam.exam_type == models.ExamType.test_exam and subj.paper_group:
                group_key = subj.paper_group.strip().lower()
            else:
                group_key = f"subject-{subj.id}"
            grouped_subjects.setdefault(group_key, []).append(subj)

        for group_key, group_subjects in grouped_subjects.items():
            group_subjects.sort(key=lambda s: (s.paper_number or 0, s.id))
            combined_marks = 0.0
            combined_full_marks = 0
            combined_pass_marks = 0
            has_any_marks = False
            has_fail_component = False
            group_name = group_subjects[0].paper_group or group_subjects[0].name
            group_code = group_subjects[0].code
            group_optional = False

            for subj in group_subjects:
                marks = marks_lookup.get((student.id, subj.id))
                if marks is None:
                    continue
                has_any_marks = True
                combined_marks += marks
                combined_full_marks += subj.full_marks
                combined_pass_marks += subj.pass_marks

                subj_letter, subj_point = get_grade(marks)
                if subj_letter == "F" or marks < subj.pass_marks:
                    has_fail_component = True

                if is_subject_optional_for_student(subj, selected_optional):
                    group_optional = True

            if not has_any_marks:
                continue

            if len(group_subjects) > 1 and exam.exam_type == models.ExamType.test_exam:
                percent = (combined_marks / combined_full_marks * 100) if combined_full_marks else 0.0
                letter, point = get_grade(percent)
                if has_fail_component:
                    letter, point = "F", 0.0
                marks_for_display = combined_marks
            else:
                subj = group_subjects[0]
                marks_for_display = marks_lookup.get((student.id, subj.id), 0.0)
                letter, point = get_grade(marks_for_display)
                if marks_for_display < subj.pass_marks:
                    has_fail_component = True

            subject_type = "optional" if group_optional else "mandatory"
            subject_results.append(SubjectResult(
                subject_name=group_name,
                subject_code=group_code,
                marks=marks_for_display,
                grade_letter=letter,
                grade_point=point,
                subject_type=subject_type,
            ))
            grade_inputs.append({
                "grade_letter": letter,
                "grade_point": point,
                "subject_type": subject_type,
            })

        if not subject_results:
            continue

        gpa, status = calculate_gpa(grade_inputs)
        total_marks = sum(sr.marks for sr in subject_results)

        results.append(StudentResult(
            roll=student.roll,
            registration_number=student.registration_number,
            full_name=student.full_name,
            guardian_phone=student.guardian_phone,
            optional_subject=student.optional_subject,
            subject_results=subject_results,
            gpa=gpa,
            status=status,
            total_marks=total_marks,
            total_subjects=len(subject_results),
        ))

    ranked = sorted(results, key=lambda r: (-r.gpa, -r.total_marks))
    for position, res in enumerate(ranked, start=1):
        res.position = position

    appeared = len(results)
    passed = sum(1 for r in results if r.status == "PASS")
    failed = appeared - passed
    avg_gpa = round(sum(r.gpa for r in results) / appeared, 2) if appeared > 0 else 0.0
    a_plus = sum(1 for r in results if r.gpa == 5.0)
    highest_gpa = max((r.gpa for r in results), default=0.0)
    lowest_gpa = min((r.gpa for r in results), default=0.0)

    return ExamResultSummary(
        exam=exam,
        total_students=len(students),
        appeared=appeared,
        passed=passed,
        failed=failed,
        pass_rate=round((passed / appeared * 100), 1) if appeared > 0 else 0.0,
        average_gpa=avg_gpa,
        a_plus_count=a_plus,
        highest_gpa=highest_gpa,
        lowest_gpa=lowest_gpa,
        results=results,
    )


@router.get("/{exam_id}", response_model=ExamResultSummary)
def get_results(
    exam_id: int,
    db: Session = Depends(get_db),
    _=Depends(require_any)
):
    return build_exam_results(exam_id, db)


@router.get("/{exam_id}/student/{roll}")
def get_student_result(
    exam_id: int,
    roll: int,
    db: Session = Depends(get_db),
    _=Depends(require_any)
):
    summary = build_exam_results(exam_id, db)
    student_result = next((r for r in summary.results if r.roll == roll), None)
    if not student_result:
        raise HTTPException(404, f"No result found for roll {roll}")
    return student_result


@router.get("/{exam_id}/export/pdf")
def export_pdf(
    exam_id: int,
    db: Session = Depends(get_db),
    _=Depends(require_any)
):
    summary = build_exam_results(exam_id, db)
    pdf_bytes = generate_grade_sheet_pdf(summary)
    filename = f"result_{summary.exam.college.name.replace(' ', '_')}_{summary.exam.year}_{summary.exam.term.replace(' ', '_')}.pdf"
    return StreamingResponse(
        BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


@router.get("/{exam_id}/student/{roll}/export/pdf")
def export_student_pdf(
    exam_id: int,
    roll: int,
    db: Session = Depends(get_db),
    _=Depends(require_any)
):
    summary = build_exam_results(exam_id, db)
    student_result = next((r for r in summary.results if r.roll == roll), None)
    if not student_result:
        raise HTTPException(404, f"No result found for roll {roll}")
    pdf_bytes = generate_student_result_pdf(summary, student_result)
    filename = f"result_{summary.exam.college.name.replace(' ', '_')}_{summary.exam.year}_{summary.exam.term.replace(' ', '_')}_roll_{roll}.pdf"
    return StreamingResponse(
        BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


@router.get("/{exam_id}/export/excel")
def export_excel(
    exam_id: int,
    db: Session = Depends(get_db),
    _=Depends(require_any)
):
    summary = build_exam_results(exam_id, db)
    excel_bytes = generate_result_excel(summary)
    filename = f"gradesheet_{summary.exam.year}.xlsx"
    return StreamingResponse(
        BytesIO(excel_bytes),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


@router.get("/{exam_id}/whatsapp-summary")
def whatsapp_summary(
    exam_id: int,
    db: Session = Depends(get_db),
    _=Depends(require_any)
):
    """Return a WhatsApp-ready text summary of results."""
    summary = build_exam_results(exam_id, db)
    exam = summary.exam

    lines = [
        f"📋 *{exam.college.name}*",
        f"HSC {exam.year} — {exam.term} | {exam.group} Group",
        f"━━━━━━━━━━━━━━━━━━",
        f"📊 Total: {summary.appeared} | ✅ Pass: {summary.passed} | ❌ Fail: {summary.failed}",
        f"📈 Pass Rate: {summary.pass_rate}% | Avg GPA: {summary.average_gpa}",
        f"━━━━━━━━━━━━━━━━━━",
    ]
    for r in summary.results:
        icon = "✅" if r.status == "PASS" else "❌"
        lines.append(f"{r.roll}. {r.full_name}: *GPA {r.gpa}* {icon}")

    lines.append(f"━━━━━━━━━━━━━━━━━━")
    lines.append("Generated by ResultBondhu 📱")

    return {"text": "\n".join(lines)}
