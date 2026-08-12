/*
# Add sks column to courses table

1. Modified Tables
- `courses`: added `sks` (int, nullable) — credit hours for the course (e.g. 3 SKS).
  Nullable so existing rows are unaffected.

2. Security
- No policy changes — existing anon+authenticated CRUD policies already cover the new column.
*/

ALTER TABLE courses ADD COLUMN IF NOT EXISTS sks int;

-- helpful index for filtering
CREATE INDEX IF NOT EXISTS idx_courses_sks ON courses(sks);
