/*
# Convert to multi-user: add user_id + owner-scoped RLS

The app is gaining login/signup. Data must now be isolated per user — each
authenticated user only sees courses and sessions they own.

1. Modified Tables
- `courses`: added `user_id` (uuid, NOT NULL, defaults to auth.uid(), FK to auth.users ON DELETE CASCADE).
- `sessions`: added `user_id` (uuid, NOT NULL, defaults to auth.uid(), FK to auth.users ON DELETE CASCADE).

2. Security
- RLS stays enabled (already was).
- OLD anon+authenticated open policies are DROPPED.
- NEW owner-scoped policies (SELECT/INSERT/UPDATE/DELETE) added for `authenticated` only,
  using auth.uid() = user_id.
- anon role gets NO policies — unauthenticated users cannot read or write.
- user_id columns default to auth.uid() so inserts that omit user_id still pass WITH CHECK.

3. Notes
- Safe to re-run: ADD COLUMN IF NOT EXISTS, DROP POLICY IF EXISTS, CREATE POLICY.
- No existing columns dropped or renamed — no data loss.
*/

ALTER TABLE courses
  ADD COLUMN IF NOT EXISTS user_id uuid NOT NULL DEFAULT auth.uid()
  REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE sessions
  ADD COLUMN IF NOT EXISTS user_id uuid NOT NULL DEFAULT auth.uid()
  REFERENCES auth.users(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_courses_user_id ON courses(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);

DROP POLICY IF EXISTS "anon_select_courses" ON courses;
DROP POLICY IF EXISTS "anon_insert_courses" ON courses;
DROP POLICY IF EXISTS "anon_update_courses" ON courses;
DROP POLICY IF EXISTS "anon_delete_courses" ON courses;

DROP POLICY IF EXISTS "anon_select_sessions" ON sessions;
DROP POLICY IF EXISTS "anon_insert_sessions" ON sessions;
DROP POLICY IF EXISTS "anon_update_sessions" ON sessions;
DROP POLICY IF EXISTS "anon_delete_sessions" ON sessions;

CREATE POLICY "select_own_courses" ON courses FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "insert_own_courses" ON courses FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "update_own_courses" ON courses FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "delete_own_courses" ON courses FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "select_own_sessions" ON sessions FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "insert_own_sessions" ON sessions FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "update_own_sessions" ON sessions FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "delete_own_sessions" ON sessions FOR DELETE
  TO authenticated USING (auth.uid() = user_id);