-- Migration: add exam_type to exams and paper grouping support to subjects

-- SQLite / generic SQL:
ALTER TABLE exams ADD COLUMN exam_type VARCHAR(20);
UPDATE exams SET exam_type = 'first_year' WHERE exam_type IS NULL;
ALTER TABLE subjects ADD COLUMN paper_group VARCHAR(100);
ALTER TABLE subjects ADD COLUMN paper_number INTEGER;

-- If using Postgres or another RDBMS that supports ALTER TABLE with ADD COLUMN and default/NOT NULL:
-- ALTER TABLE exams ADD COLUMN exam_type VARCHAR(20) DEFAULT 'first_year';
-- ALTER TABLE subjects ADD COLUMN paper_group VARCHAR(100);
-- ALTER TABLE subjects ADD COLUMN paper_number INTEGER;
