from pydantic import BaseModel, EmailStr, field_validator
from typing import Optional, List
from datetime import datetime
from models import UserRole, SubjectType, ExamType


# ── Auth ──────────────────────────────────────────────
class TokenResponse(BaseModel):
    access_token: str
    token_type: str
    user: "UserOut"


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


# ── User ──────────────────────────────────────────────
class UserCreate(BaseModel):
    full_name: str
    email: EmailStr
    password: str
    role: UserRole = UserRole.teacher


class UserOut(BaseModel):
    id: int
    full_name: str
    email: str
    role: UserRole
    is_active: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    is_active: Optional[bool] = None
    role: Optional[UserRole] = None


# ── College ───────────────────────────────────────────
class CollegeCreate(BaseModel):
    name: str
    eiin: Optional[str] = None
    address: Optional[str] = None
    principal_name: Optional[str] = None


class CollegeOut(BaseModel):
    id: int
    name: str
    eiin: Optional[str]
    address: Optional[str]
    principal_name: Optional[str]
    created_at: datetime

    model_config = {"from_attributes": True}


# ── Exam ──────────────────────────────────────────────
class ExamCreate(BaseModel):
    college_id: int
    year: int
    term: str
    group: str
    exam_type: ExamType = ExamType.first_year


class ExamOut(BaseModel):
    id: int
    college_id: int
    year: int
    term: str
    group: str
    exam_type: ExamType
    is_published: bool
    created_at: datetime
    college: CollegeOut

    model_config = {"from_attributes": True}


# ── Subject ───────────────────────────────────────────
class SubjectCreate(BaseModel):
    exam_id: int
    name: str
    code: str
    subject_type: SubjectType = SubjectType.mandatory
    full_marks: int = 100
    pass_marks: int = 33
    paper_group: Optional[str] = None
    paper_number: Optional[int] = None
    assigned_teacher_id: Optional[int] = None


class SubjectOut(BaseModel):
    id: int
    exam_id: int
    name: str
    code: str
    subject_type: SubjectType
    full_marks: int
    pass_marks: int
    paper_group: Optional[str]
    paper_number: Optional[int]
    assigned_teacher_id: Optional[int]
    assigned_teacher: Optional[UserOut]

    model_config = {"from_attributes": True}


# ── Student ───────────────────────────────────────────
class StudentCreate(BaseModel):
    exam_id: int
    roll: int
    registration_number: Optional[str] = None
    full_name: str
    guardian_phone: Optional[str] = None
    optional_subject: Optional[str] = None


class StudentOut(BaseModel):
    id: int
    exam_id: int
    roll: int
    registration_number: Optional[str]
    full_name: str
    guardian_phone: Optional[str]
    optional_subject: Optional[str]

    model_config = {"from_attributes": True}


class StudentBulkCreate(BaseModel):
    exam_id: int
    students: List[StudentCreate]


# ── Mark ──────────────────────────────────────────────
class MarkCreate(BaseModel):
    student_id: int
    subject_id: int
    marks_obtained: float

    @field_validator("marks_obtained")
    @classmethod
    def validate_marks(cls, v):
        if v < 0:
            raise ValueError("Marks cannot be negative")
        return v


class MarkBulkCreate(BaseModel):
    subject_id: int
    entries: List[dict]  # [{student_id, marks_obtained}]


class MarkOut(BaseModel):
    id: int
    student_id: int
    subject_id: int
    marks_obtained: float
    entered_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


# ── GPA / Result ──────────────────────────────────────
class SubjectResult(BaseModel):
    subject_name: str
    subject_code: str
    marks: float
    grade_letter: str
    grade_point: float
    subject_type: str


class StudentResult(BaseModel):
    roll: int
    registration_number: Optional[str]
    full_name: str
    guardian_phone: Optional[str]
    optional_subject: Optional[str]
    subject_results: List[SubjectResult]
    gpa: float
    status: str  # PASS / FAIL
    total_marks: float
    total_subjects: int
    position: Optional[int] = None


class ExamResultSummary(BaseModel):
    exam: ExamOut
    total_students: int
    appeared: int
    passed: int
    failed: int
    pass_rate: float
    average_gpa: float
    a_plus_count: int
    highest_gpa: float
    lowest_gpa: float
    results: List[StudentResult]
