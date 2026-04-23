/*
  # Add Executive Function Assessment History Table

  ## Purpose
  Stores a snapshot every time an executive function assessment is saved,
  enabling a chronological logbook of rating changes per student per function.

  ## New Tables
  - `executive_function_assessment_history`
    - `id` (uuid, PK)
    - `student_id` (uuid, FK -> students)
    - `executive_function_id` (uuid, FK -> executive_functions)
    - `rating` (integer, -3 to +3)
    - `support_rating` (integer, -3 to +3)
    - `changed_by` (uuid, FK -> auth.users) — who made the change
    - `created_at` (timestamptz) — when this snapshot was recorded
    - `school_id` (uuid, FK -> schools) — for school-scoped queries

  ## Security
  - RLS enabled
  - INSERT: authenticated users who share a user_school with the student's school
  - SELECT: authenticated users who share a user_school with the student's school
*/

CREATE TABLE IF NOT EXISTS executive_function_assessment_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  executive_function_id uuid NOT NULL REFERENCES executive_functions(id) ON DELETE CASCADE,
  rating integer NOT NULL DEFAULT 0 CHECK (rating >= -3 AND rating <= 3),
  support_rating integer NOT NULL DEFAULT 0 CHECK (support_rating >= -3 AND support_rating <= 3),
  changed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  school_id uuid REFERENCES schools(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ef_history_student ON executive_function_assessment_history (student_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ef_history_school ON executive_function_assessment_history (school_id, created_at DESC);

ALTER TABLE executive_function_assessment_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view EF history for their school's students"
  ON executive_function_assessment_history FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_schools us
      WHERE us.user_id = auth.uid()
        AND us.school_id = executive_function_assessment_history.school_id
        AND us.status = 'approved'
        AND us.is_active = true
    )
  );

CREATE POLICY "Users can insert EF history for their school's students"
  ON executive_function_assessment_history FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_schools us
      WHERE us.user_id = auth.uid()
        AND us.school_id = executive_function_assessment_history.school_id
        AND us.status = 'approved'
        AND us.is_active = true
    )
  );
