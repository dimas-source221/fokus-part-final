-- Profiles and agendas tables, plus storage bucket for user photos

CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name text,
  university text,
  major text,
  semester text,
  bio text,
  avatar_url text,
  cover_url text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_profile" ON profiles;
CREATE POLICY "select_own_profile" ON profiles FOR SELECT
  TO authenticated USING (auth.uid() = id);

DROP POLICY IF EXISTS "insert_own_profile" ON profiles;
CREATE POLICY "insert_own_profile" ON profiles FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "update_own_profile" ON profiles;
CREATE POLICY "update_own_profile" ON profiles FOR UPDATE
  TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "delete_own_profile" ON profiles;
CREATE POLICY "delete_own_profile" ON profiles FOR DELETE
  TO authenticated USING (auth.uid() = id);

CREATE TABLE IF NOT EXISTS agendas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  location text,
  agenda_date date NOT NULL,
  agenda_time time,
  reminder_minutes int NOT NULL DEFAULT 10,
  notified boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE agendas ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_agendas_user_id ON agendas(user_id);
CREATE INDEX IF NOT EXISTS idx_agendas_date ON agendas(agenda_date);

DROP POLICY IF EXISTS "select_own_agendas" ON agendas;
CREATE POLICY "select_own_agendas" ON agendas FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_agendas" ON agendas;
CREATE POLICY "insert_own_agendas" ON agendas FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_agendas" ON agendas;
CREATE POLICY "update_own_agendas" ON agendas FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_agendas" ON agendas;
CREATE POLICY "delete_own_agendas" ON agendas FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

INSERT INTO storage.buckets (id, name, public)
VALUES ('user-photos', 'user-photos', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "upload_own_photos" ON storage.objects;
CREATE POLICY "upload_own_photos" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'user-photos' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "read_own_photos" ON storage.objects;
CREATE POLICY "read_own_photos" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'user-photos' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "delete_own_photos" ON storage.objects;
CREATE POLICY "delete_own_photos" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'user-photos' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "public_read_user_photos" ON storage.objects;
CREATE POLICY "public_read_user_photos" ON storage.objects
  FOR SELECT TO anon, authenticated
  USING (bucket_id = 'user-photos');