/*
  # Add Support for Multiple Students per Incident

  1. New Table
    - `behavior_incident_students`
      - `id` (uuid, primary key)
      - `incident_id` (uuid, foreign key to behavior_incidents)
      - `student_id` (uuid, foreign key to students)
      - `role_id` (uuid, foreign key to student_roles)
      - `created_at` (timestamp)

  2. Changes
    - Keep the existing `student_id` column on `behavior_incidents` for backward compatibility
    - The junction table will be the primary source of truth for student-incident relationships

  3. Security
    - Enable RLS on the junction table
    - Add policies for authenticated users to manage their school's incident-student relationships
*/

-- Create junction table for incident-student relationships
CREATE TABLE IF NOT EXISTS behavior_incident_students (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id uuid NOT NULL REFERENCES behavior_incidents(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  role_id uuid NOT NULL REFERENCES student_roles(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(incident_id, student_id, role_id)
);

-- Enable RLS
ALTER TABLE behavior_incident_students ENABLE ROW LEVEL SECURITY;

-- Policies for behavior_incident_students
CREATE POLICY "Users can view incident students for their school"
  ON behavior_incident_students FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM behavior_incidents bi
      INNER JOIN user_schools us ON bi.school_id = us.school_id
      WHERE bi.id = behavior_incident_students.incident_id
      AND us.user_id = auth.uid()
      AND us.status = 'approved'
      AND us.is_active = true
    )
  );

CREATE POLICY "Users can insert incident students for their school"
  ON behavior_incident_students FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM behavior_incidents bi
      INNER JOIN user_schools us ON bi.school_id = us.school_id
      WHERE bi.id = behavior_incident_students.incident_id
      AND us.user_id = auth.uid()
      AND us.status = 'approved'
      AND us.is_active = true
    )
  );

CREATE POLICY "Users can update incident students for their school"
  ON behavior_incident_students FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM behavior_incidents bi
      INNER JOIN user_schools us ON bi.school_id = us.school_id
      WHERE bi.id = behavior_incident_students.incident_id
      AND us.user_id = auth.uid()
      AND us.status = 'approved'
      AND us.is_active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM behavior_incidents bi
      INNER JOIN user_schools us ON bi.school_id = us.school_id
      WHERE bi.id = behavior_incident_students.incident_id
      AND us.user_id = auth.uid()
      AND us.status = 'approved'
      AND us.is_active = true
    )
  );

CREATE POLICY "Users can delete incident students for their school"
  ON behavior_incident_students FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM behavior_incidents bi
      INNER JOIN user_schools us ON bi.school_id = us.school_id
      WHERE bi.id = behavior_incident_students.incident_id
      AND us.user_id = auth.uid()
      AND us.status = 'approved'
      AND us.is_active = true
    )
  );

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_behavior_incident_students_incident_id 
  ON behavior_incident_students(incident_id);

CREATE INDEX IF NOT EXISTS idx_behavior_incident_students_student_id 
  ON behavior_incident_students(student_id);
