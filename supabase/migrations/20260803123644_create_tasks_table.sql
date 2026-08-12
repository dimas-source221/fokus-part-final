/*
# Create tasks table (multi-user, owner-scoped)

A personal/work task manager with categories, priorities, due times, and done state.

1. New Tables
- `tasks`:
  - id (uuid PK)
  - user_id (uuid, NOT NULL, defaults to auth.uid(), FK -> auth.users ON DELETE CASCADE)
  - title (text, not null) — task description
  - category (text, not null, default 'pekerjaan') — 'pekerjaan' | 'pribadi'
  - priority (text, not null, default 'sedang') — 'tinggi' | 'sedang' | 'rendah'
  - done (boolean, not null, default false)
  - due_at (timestamptz, nullable) — optional reminder/due time
  - created_at (timestamptz, default now())

2. Security
- RLS enabled.
- Owner-scoped CRUD for `authenticated` only (auth.uid() = user_id).
- anon role gets no policies.
- user_id defaults to auth.uid() so inserts omitting it still pass WITH CHECK.

3. Notes
- Safe to re-run: CREATE TABLE IF NOT EXISTS, DROP POLICY IF EXISTS, CREATE POLICY.
*/

CREATE TABLE IF NOT EXISTS tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  category text NOT NULL DEFAULT 'pekerjaan',
  priority text NOT NULL DEFAULT 'sedang',
  done boolean NOT NULL DEFAULT false,
  due_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_done ON tasks(done);
CREATE INDEX IF NOT EXISTS idx_tasks_due_at ON tasks(due_at);

DROP POLICY IF EXISTS "select_own_tasks" ON tasks;
CREATE POLICY "select_own_tasks" ON tasks FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_tasks" ON tasks;
CREATE POLICY "insert_own_tasks" ON tasks FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_tasks" ON tasks;
CREATE POLICY "update_own_tasks" ON tasks FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_tasks" ON tasks;
CREATE POLICY "delete_own_tasks" ON tasks FOR DELETE
  TO authenticated USING (auth.uid() = user_id);