from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from sqlalchemy import create_engine
from models import Base
import os
from dotenv import load_dotenv

load_dotenv()

# DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./resultbondhu.db")
DATABASE_URL = os.getenv("DATABASE_URL")
connect_args = {}
if DATABASE_URL.startswith("sqlite"):
    connect_args = {"check_same_thread": False}

# engine = create_engine(DATABASE_URL, connect_args=connect_args)
engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def ensure_sqlite_columns():
    if engine.dialect.name != "sqlite":
        return

    with engine.connect() as conn:
        existing_columns = {
            row[1] for row in conn.execute(text("PRAGMA table_info(exams)"))
        }
        if "exam_type" not in existing_columns:
            conn.execute(text("ALTER TABLE exams ADD COLUMN exam_type VARCHAR(20) DEFAULT 'first_year'"))

        existing_subject_columns = {
            row[1] for row in conn.execute(text("PRAGMA table_info(subjects)"))
        }
        if "paper_group" not in existing_subject_columns:
            conn.execute(text("ALTER TABLE subjects ADD COLUMN paper_group VARCHAR(100)"))
        if "paper_number" not in existing_subject_columns:
            conn.execute(text("ALTER TABLE subjects ADD COLUMN paper_number INTEGER"))
        conn.commit()


def create_tables():
    Base.metadata.create_all(bind=engine)
    ensure_sqlite_columns()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
