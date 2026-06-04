from sqlalchemy import (
    Column, Integer, String, Float, Boolean, DateTime,
    ForeignKey, Text, Enum as SAEnum
)
from sqlalchemy.orm import relationship, declarative_base
from datetime import datetime
import enum

Base = declarative_base()


class UserRole(str, enum.Enum):
    admin = "admin"
    controller = "controller"
    teacher = "teacher"


class SubjectType(str, enum.Enum):
    mandatory = "mandatory"
    optional = "optional"


class ExamType(str, enum.Enum):
    first_year = "first_year"
    second_year = "second_year"
    test_exam = "test_exam"


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    full_name = Column(String(100), nullable=False)
    email = Column(String(100), unique=True, index=True, nullable=False)
    hashed_password = Column(String(200), nullable=False)
    role = Column(SAEnum(UserRole), default=UserRole.teacher)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    marks_entered = relationship("Mark", back_populates="entered_by_user")


class College(Base):
    __tablename__ = "colleges"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), nullable=False)
    eiin = Column(String(20), unique=True)
    address = Column(Text)
    principal_name = Column(String(100))
    created_at = Column(DateTime, default=datetime.utcnow)

    exams = relationship("Exam", back_populates="college")


class Exam(Base):
    __tablename__ = "exams"

    id = Column(Integer, primary_key=True, index=True)
    college_id = Column(Integer, ForeignKey("colleges.id"), nullable=False)
    year = Column(Integer, nullable=False)
    term = Column(String(50), nullable=False)  # e.g. "1st Semester", "Pre-Test"
    group = Column(String(30), nullable=False)  # Science, Commerce, Humanities
    exam_type = Column(SAEnum(ExamType), default=ExamType.first_year)
    is_published = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    college = relationship("College", back_populates="exams")
    subjects = relationship("Subject", back_populates="exam")
    students = relationship("Student", back_populates="exam")


class Subject(Base):
    __tablename__ = "subjects"

    id = Column(Integer, primary_key=True, index=True)
    exam_id = Column(Integer, ForeignKey("exams.id"), nullable=False)
    name = Column(String(100), nullable=False)
    code = Column(String(10), nullable=False)
    subject_type = Column(SAEnum(SubjectType), default=SubjectType.mandatory)
    full_marks = Column(Integer, default=100)
    pass_marks = Column(Integer, default=33)
    paper_group = Column(String(100), nullable=True)
    paper_number = Column(Integer, nullable=True)
    assigned_teacher_id = Column(Integer, ForeignKey("users.id"), nullable=True)

    exam = relationship("Exam", back_populates="subjects")
    marks = relationship("Mark", back_populates="subject")
    assigned_teacher = relationship("User", foreign_keys=[assigned_teacher_id])


class Student(Base):
    __tablename__ = "students"

    id = Column(Integer, primary_key=True, index=True)
    exam_id = Column(Integer, ForeignKey("exams.id"), nullable=False)
    roll = Column(Integer, nullable=False)
    registration_number = Column(String(20))
    full_name = Column(String(100), nullable=False)
    guardian_phone = Column(String(15))
    is_active = Column(Boolean, default=True)
    optional_subject = Column(String(100), nullable=True)

    exam = relationship("Exam", back_populates="students")
    marks = relationship("Mark", back_populates="student")


class Mark(Base):
    __tablename__ = "marks"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.id"), nullable=False)
    subject_id = Column(Integer, ForeignKey("subjects.id"), nullable=False)
    marks_obtained = Column(Float, nullable=False)
    entered_by = Column(Integer, ForeignKey("users.id"))
    entered_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    student = relationship("Student", back_populates="marks")
    subject = relationship("Subject", back_populates="marks")
    entered_by_user = relationship("User", back_populates="marks_entered")
