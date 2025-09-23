/*
  # Create student_grades table for connecting students to leerjaren

  1. New Tables
    - `student_grades`
      - `id` (uuid, primary key)
      - `student_id` (uuid, foreign key to students)
      - `grade_id` (uuid, foreign key to school_grades)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on `student_grades` table
    - Add policy for school members to manage student grade connections

  3. Indexes
    - Index on student_id for fast lookups
    - Index on grade_id for fast lookups
    - Unique constraint on student_id + grade_id combination
*/

CREATE TABLE IF NOT EXISTS student_grades (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  grade_id uuid NOT NULL REFERENCES school_grades(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(student_id, grade_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_student_grades_student_id ON student_grades(student_id);
CREATE INDEX IF NOT EXISTS idx_student_grades_grade_id ON student_grades(grade_id);

-- Enable RLS
ALTER TABLE student_grades ENABLE ROW LEVEL SECURITY;

-- Create policy for school members to manage student grade connections
CREATE POLICY "School members can manage student grades"
  ON student_grades
  FOR ALL
  TO authenticated
  USING (
    student_id IN (
      SELECT s.id 
      FROM students s
      WHERE s.school_id IN (
        SELECT us.school_id 
        FROM user_schools us 
        WHERE us.user_id = auth.uid() 
        AND us.status = 'approved' 
        AND us.is_active = true
      )
    )
  )
  WITH CHECK (
    student_id IN (
      SELECT s.id 
      FROM students s
      WHERE s.school_id IN (
        SELECT us.school_id 
        FROM user_schools us 
        WHERE us.user_id = auth.uid() 
        AND us.status = 'approved' 
        AND us.is_active = true
      )
    )
  );