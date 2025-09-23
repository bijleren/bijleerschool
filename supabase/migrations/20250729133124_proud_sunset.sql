/*
  # Add relationship between groups and school_grades

  1. New Tables
    - `group_grades` - Cross-reference table linking groups to school_grades
      - `id` (uuid, primary key)
      - `group_id` (uuid, foreign key to groups)
      - `grade_id` (uuid, foreign key to school_grades)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on `group_grades` table
    - Add policy for school members to manage group-grade relationships

  3. Changes
    - Create cross-reference table for many-to-many relationship
    - Add proper foreign key constraints
    - Add unique constraint to prevent duplicate relationships
*/

-- Create group_grades cross-reference table
CREATE TABLE IF NOT EXISTS group_grades (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  grade_id uuid NOT NULL REFERENCES school_grades(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(group_id, grade_id)
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_group_grades_group_id ON group_grades(group_id);
CREATE INDEX IF NOT EXISTS idx_group_grades_grade_id ON group_grades(grade_id);

-- Enable RLS
ALTER TABLE group_grades ENABLE ROW LEVEL SECURITY;

-- Add RLS policies
CREATE POLICY "School members can manage group grades"
  ON group_grades
  FOR ALL
  TO authenticated
  USING (
    group_id IN (
      SELECT g.id FROM groups g
      WHERE g.school_id IN (
        SELECT user_schools.school_id
        FROM user_schools
        WHERE user_schools.user_id = auth.uid()
          AND user_schools.status = 'approved'
          AND user_schools.is_active = true
      )
    )
  )
  WITH CHECK (
    group_id IN (
      SELECT g.id FROM groups g
      WHERE g.school_id IN (
        SELECT user_schools.school_id
        FROM user_schools
        WHERE user_schools.user_id = auth.uid()
          AND user_schools.status = 'approved'
          AND user_schools.is_active = true
      )
    )
  );