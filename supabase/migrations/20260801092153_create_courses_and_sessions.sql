/*
# Create courses and sessions tables (single-tenant, no auth)

This app is a lecture tracker ("Pelacak Perkuliahan") for university students.
No sign-in screen — single-tenant, shared data. All policies allow anon + authenticated.

1. New Tables
- `courses`: a university course (mata kuliah) in a given semester.
  - id (uuid PK)
  - course_name (text, not null) — e.g. "Kalkulus Lanjut"
  - semester (int, not null, default 1) — 1..9
  - code_sks (text, nullable) — e.g. "IF101 (3 SKS)"
  - session_count (int, not null, default 8) — number of lecture sessions
  - notes (text, nullable) — free-form notes (dosen, WA group, etc.)
  - created_at (timestamptz)
- `sessions`: a single lecture session belonging to a course.
  - id (uuid PK)
  - course_id (uuid FK -> courses, ON DELETE CASCADE)
  - session_number (int, not null) — 1-based ordering within the course
  - session_date (date, nullable) — when the session happened/will happen
  - attendance_status (text, default 'Belum') — Belum | Hadir | Tidak Hadir | Izin
  - discussion_status (text, default 'Belum Diskusikan') — Belum Diskusikan | Sudah Diskusikan | Tanpa Diskusi
  - task_status (text, default 'Belum Mulai') — Belum Mulai | Sedang Dikerjakan | Selesai | Tanpa Tugas
  - notes (text, nullable)
  - created_at (timestamptz)
  - UNIQUE(course_id, session_number)

2. Security
- RLS enabled on both tables.
- anon + authenticated CRUD (single-tenant, intentionally shared data).
*/
CREATE TABLE IF NOT EXISTS courses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_name text NOT NULL,
  semester int NOT NULL DEFAULT 1,
  code_sks text,
  session_count int NOT NULL DEFAULT 8,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  session_number int NOT NULL,
  session_date date,
  attendance_status text NOT NULL DEFAULT 'Belum',
  discussion_status text NOT NULL DEFAULT 'Belum Diskusikan',
  task_status text NOT NULL DEFAULT 'Belum Mulai',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(course_id, session_number)
);

ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;

-- courses policies
DROP POLICY IF EXISTS "anon_select_courses" ON courses;
CREATE POLICY "anon_select_courses" ON courses FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_courses" ON courses;
CREATE POLICY "anon_insert_courses" ON courses FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_courses" ON courses;
CREATE POLICY "anon_update_courses" ON courses FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_courses" ON courses;
CREATE POLICY "anon_delete_courses" ON courses FOR DELETE
  TO anon, authenticated USING (true);

-- sessions policies
DROP POLICY IF EXISTS "anon_select_sessions" ON sessions;
CREATE POLICY "anon_select_sessions" ON sessions FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_sessions" ON sessions;
CREATE POLICY "anon_insert_sessions" ON sessions FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_sessions" ON sessions;
CREATE POLICY "anon_update_sessions" ON sessions FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_sessions" ON sessions;
CREATE POLICY "anon_delete_sessions" ON sessions FOR DELETE
  TO anon, authenticated USING (true);

-- helpful indexes
CREATE INDEX IF NOT EXISTS idx_courses_semester ON courses(semester);
CREATE INDEX IF NOT EXISTS idx_sessions_course_id ON sessions(course_id);