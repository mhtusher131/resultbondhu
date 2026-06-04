-- Add optional_subject column to students table
-- Compatible with SQLite/Postgres/MySQL

ALTER TABLE students ADD COLUMN optional_subject VARCHAR(100);
