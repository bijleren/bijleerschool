/*
  # Add Student Tags System

  ## Overview
  Adds a complete tagging system for students, scoped per school.

  ## New Tables

  ### 1. student_tag_definitions
  Stores the tag templates belonging to a school.
  - id (uuid, pk)
  - school_id (uuid, fk to schools) — scopes tags per school
  - name (text) — display name of the tag
  - color (text) — hex color code (e.g. #E53E3E)
  - description (text, nullable) — optional longer description
  - created_by (uuid, fk to auth.users)
  - created_at (timestamptz)

  ### 2. student_tag_assignments
  Live junction table linking tags to students.
  - id (uuid, pk)
  - student_id (uuid, fk to students)
  - tag_definition_id (uuid, fk to student_tag_definitions)
  - assigned_by (uuid, fk to auth.users)
  - assigned_at (timestamptz)
  - Unique constraint: one tag per student (no duplicates)

  ### 3. student_tag_log
  Immutable audit log. Auto-populated by a Postgres trigger.
  - id (uuid, pk)
  - student_id (uuid, fk to students)
  - tag_definition_id (uuid, nullable — survives tag deletion)
  - tag_name (text) — snapshot of name at time of action
  - tag_color (text) — snapshot of color at time of action
  - action (text: 'added' | 'removed')
  - performed_by (uuid, fk to auth.users)
  - performed_at (timestamptz)

  ## Security
  - RLS enabled on all three tables
  - School members (via user_schools) can manage tags for their own school
  - Log entries are written by a SECURITY DEFINER trigger function

  ## Trigger
  - log_student_tag_change() fires AFTER INSERT or DELETE on student_tag_assignments
  - Writes a row to student_tag_log with a snapshot of the tag name and color
*/

-- ============================================================
-- 1. student_tag_definitions
-- ============================================================
CREATE TABLE IF NOT EXISTS student_tag_definitions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  name text NOT NULL,
  color text NOT NULL DEFAULT '#3B82F6',
  description text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_student_tag_definitions_school_id
  ON student_tag_definitions(school_id);

ALTER TABLE student_tag_definitions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "School members can view their school tags"
  ON student_tag_definitions FOR SELECT
  TO authenticated
  USING (
    school_id IN (
      SELECT school_id FROM user_schools WHERE user_id = auth.uid() AND is_active = true
    )
  );

CREATE POLICY "School members can create tags for their school"
  ON student_tag_definitions FOR INSERT
  TO authenticated
  WITH CHECK (
    school_id IN (
      SELECT school_id FROM user_schools WHERE user_id = auth.uid() AND is_active = true
    )
  );

CREATE POLICY "School members can update tags for their school"
  ON student_tag_definitions FOR UPDATE
  TO authenticated
  USING (
    school_id IN (
      SELECT school_id FROM user_schools WHERE user_id = auth.uid() AND is_active = true
    )
  )
  WITH CHECK (
    school_id IN (
      SELECT school_id FROM user_schools WHERE user_id = auth.uid() AND is_active = true
    )
  );

CREATE POLICY "School members can delete tags for their school"
  ON student_tag_definitions FOR DELETE
  TO authenticated
  USING (
    school_id IN (
      SELECT school_id FROM user_schools WHERE user_id = auth.uid() AND is_active = true
    )
  );

-- ============================================================
-- 2. student_tag_assignments
-- ============================================================
CREATE TABLE IF NOT EXISTS student_tag_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  tag_definition_id uuid NOT NULL REFERENCES student_tag_definitions(id) ON DELETE CASCADE,
  assigned_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  assigned_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(student_id, tag_definition_id)
);

CREATE INDEX IF NOT EXISTS idx_student_tag_assignments_student_id
  ON student_tag_assignments(student_id);

CREATE INDEX IF NOT EXISTS idx_student_tag_assignments_tag_definition_id
  ON student_tag_assignments(tag_definition_id);

ALTER TABLE student_tag_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "School members can view tag assignments for their school students"
  ON student_tag_assignments FOR SELECT
  TO authenticated
  USING (
    student_id IN (
      SELECT s.id FROM students s
      JOIN user_schools us ON us.school_id = s.school_id
      WHERE us.user_id = auth.uid() AND us.is_active = true
    )
  );

CREATE POLICY "School members can assign tags to their school students"
  ON student_tag_assignments FOR INSERT
  TO authenticated
  WITH CHECK (
    student_id IN (
      SELECT s.id FROM students s
      JOIN user_schools us ON us.school_id = s.school_id
      WHERE us.user_id = auth.uid() AND us.is_active = true
    )
  );

CREATE POLICY "School members can remove tag assignments for their school students"
  ON student_tag_assignments FOR DELETE
  TO authenticated
  USING (
    student_id IN (
      SELECT s.id FROM students s
      JOIN user_schools us ON us.school_id = s.school_id
      WHERE us.user_id = auth.uid() AND us.is_active = true
    )
  );

-- ============================================================
-- 3. student_tag_log
-- ============================================================
CREATE TABLE IF NOT EXISTS student_tag_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  tag_definition_id uuid REFERENCES student_tag_definitions(id) ON DELETE SET NULL,
  tag_name text NOT NULL,
  tag_color text NOT NULL,
  action text NOT NULL CHECK (action IN ('added', 'removed')),
  performed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  performed_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_student_tag_log_student_id
  ON student_tag_log(student_id);

CREATE INDEX IF NOT EXISTS idx_student_tag_log_performed_at
  ON student_tag_log(performed_at);

ALTER TABLE student_tag_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "School members can view tag log for their school students"
  ON student_tag_log FOR SELECT
  TO authenticated
  USING (
    student_id IN (
      SELECT s.id FROM students s
      JOIN user_schools us ON us.school_id = s.school_id
      WHERE us.user_id = auth.uid() AND us.is_active = true
    )
  );

CREATE POLICY "Trigger function can insert tag log entries"
  ON student_tag_log FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- ============================================================
-- 4. Trigger: auto-log tag assignment changes
-- ============================================================
CREATE OR REPLACE FUNCTION log_student_tag_change()
RETURNS TRIGGER AS $$
DECLARE
  v_tag_name text;
  v_tag_color text;
  v_student_id uuid;
  v_tag_definition_id uuid;
  v_performed_by uuid;
  v_action text;
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_student_id := NEW.student_id;
    v_tag_definition_id := NEW.tag_definition_id;
    v_performed_by := NEW.assigned_by;
    v_action := 'added';
  ELSE
    v_student_id := OLD.student_id;
    v_tag_definition_id := OLD.tag_definition_id;
    v_performed_by := OLD.assigned_by;
    v_action := 'removed';
  END IF;

  SELECT name, color INTO v_tag_name, v_tag_color
  FROM student_tag_definitions
  WHERE id = v_tag_definition_id;

  INSERT INTO student_tag_log (
    student_id,
    tag_definition_id,
    tag_name,
    tag_color,
    action,
    performed_by,
    performed_at
  ) VALUES (
    v_student_id,
    v_tag_definition_id,
    COALESCE(v_tag_name, 'Onbekende tag'),
    COALESCE(v_tag_color, '#6B7280'),
    v_action,
    v_performed_by,
    now()
  );

  IF TG_OP = 'INSERT' THEN
    RETURN NEW;
  ELSE
    RETURN OLD;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_log_student_tag_change ON student_tag_assignments;

CREATE TRIGGER trg_log_student_tag_change
  AFTER INSERT OR DELETE ON student_tag_assignments
  FOR EACH ROW EXECUTE FUNCTION log_student_tag_change();
