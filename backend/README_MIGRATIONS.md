Migration: add optional_subject to students

How to apply

- If using the default SQLite database file (`DATABASE_URL=sqlite:///./resultbondhu.db`):

```bash
# from project root
sqlite3 backend/resultbondhu.db < backend/db_migrations/001_add_optional_subject.sql
```

- If using Postgres or another RDBMS, run the SQL with the appropriate client (example for psql):

```bash
# Example (Postgres):
# psql $DATABASE_URL -f backend/db_migrations/001_add_optional_subject.sql
```

Notes
- This migration simply adds a nullable `optional_subject` varchar(100) column.
- If you use Alembic, convert this SQL into an Alembic revision instead and run `alembic upgrade head`.

### New migration
A second migration was added to support exam types and paper pairing:
- `backend/db_migrations/002_add_exam_type_and_paper_fields.sql`
- Adds `exam_type` to `exams`
- Adds `paper_group` and `paper_number` to `subjects`
