/*
# Create pomodoro_sessions table (multi-user, owner-scoped)

Tracks completed Pomodoro focus sessions for productivity stats.

1. New Tables
- `pomodoro_sessions`:
  - id (uuid PK)
  - user_id (uuid, NOT NULL, defaults to auth.uid(), FK -> auth.users ON DELETE CASCADE)
  - mode (text, not null) — 'focus' | 'short_break' | 'long_break'
  - duration_minutes (int, not null) — actual duration of the completed session
  - completed_at (timestamptz, not null, default now())

2. Security
- RLS enabled.
- Owner-scoped CRUD for `authenticated` only (auth.uid() = user_id).
- anon role gets no policies.
- user_id defaults to auth.uid() so inserts omitting it still pass WITH CHECK.

3. Notes
- Safe to re-run: CREATE TABLE IF NOT EXISTS, DROP POLICY IF EXISTS, CREATE POLICY.
*/

CREATE TABLE IF NOT EXISTS pomodoro_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  mode text NOT NULL,
  duration_minutes int NOT NULL,
  completed_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE pomodoro_sessions ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_pomodoro_user_id ON pomodoro_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_pomodoro_completed_at ON pomodoro_sessions(completed_at DESC);

DROP POLICY IF EXISTS "select_own_pomodoro" ON pomodoro_sessions;
CREATE POLICY "select_own_pomodoro" ON pomodoro_sessions FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_pomodoro" ON pomodoro_sessions;
CREATE POLICY "insert_own_pomodoro" ON pomodoro_sessions FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_pomodoro" ON pomodoro_sessions;
CREATE POLICY "delete_own_pomodoro" ON pomodoro_sessions FOR DELETE
  TO authenticated USING (auth.uid() = user_id);