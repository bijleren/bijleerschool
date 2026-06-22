
CREATE TABLE IF NOT EXISTS student_logins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  label text NOT NULL,
  url text NOT NULL,
  username text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_student_logins_student_id ON student_logins(student_id);

ALTER TABLE student_logins ENABLE ROW LEVEL SECURITY;

-- Authenticated users can read logins for students in their school
CREATE POLICY "select_student_logins_authenticated" ON student_logins
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM students s
      JOIN user_schools us ON us.school_id = s.school_id
      WHERE s.id = student_logins.student_id
        AND us.user_id = auth.uid()
    )
  );

-- Authenticated users can insert logins for students in their school
CREATE POLICY "insert_student_logins_authenticated" ON student_logins
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM students s
      JOIN user_schools us ON us.school_id = s.school_id
      WHERE s.id = student_logins.student_id
        AND us.user_id = auth.uid()
    )
  );

-- Authenticated users can update logins for students in their school
CREATE POLICY "update_student_logins_authenticated" ON student_logins
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM students s
      JOIN user_schools us ON us.school_id = s.school_id
      WHERE s.id = student_logins.student_id
        AND us.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM students s
      JOIN user_schools us ON us.school_id = s.school_id
      WHERE s.id = student_logins.student_id
        AND us.user_id = auth.uid()
    )
  );

-- Authenticated users can delete logins for students in their school
CREATE POLICY "delete_student_logins_authenticated" ON student_logins
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM students s
      JOIN user_schools us ON us.school_id = s.school_id
      WHERE s.id = student_logins.student_id
        AND us.user_id = auth.uid()
    )
  );

-- Anon users can read logins by student_id (for WebWijzer public access)
CREATE POLICY "select_student_logins_anon" ON student_logins
  FOR SELECT TO anon
  USING (true);

-- updated_at trigger
CREATE OR REPLACE FUNCTION update_student_logins_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER student_logins_updated_at
  BEFORE UPDATE ON student_logins
  FOR EACH ROW EXECUTE FUNCTION update_student_logins_updated_at();
