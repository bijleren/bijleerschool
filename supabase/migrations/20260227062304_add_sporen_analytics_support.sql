/*
  # Add Sporen Analytics Support

  ## Overview
  Adds analytics infrastructure for the sporen system.

  ## Changes
  1. Add `notes` column to student_spoor_assignments for change context
  2. Add index on assigned_at for efficient timeline queries
  3. Add index on student_id + school_subject_id for history queries
  4. Create a view that computes spoor durations per student

  ## Notes
  - The student_spoor_assignments table already stores full history via is_current flag
  - No additional audit table needed; all analytics are derived from existing data
*/

-- Add a context/note field when making assignments (optional reason for change)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'student_spoor_assignments' AND column_name = 'change_notes'
  ) THEN
    ALTER TABLE student_spoor_assignments ADD COLUMN change_notes text;
  END IF;
END $$;

-- Add index on assigned_at for timeline queries
CREATE INDEX IF NOT EXISTS idx_student_spoor_assignments_assigned_at
  ON student_spoor_assignments(assigned_at DESC);

-- Add composite index for student history queries
CREATE INDEX IF NOT EXISTS idx_student_spoor_assignments_student_subject
  ON student_spoor_assignments(student_id, school_subject_id, assigned_at DESC);

-- Add composite index for group + subject history (log view)
CREATE INDEX IF NOT EXISTS idx_student_spoor_assignments_group_subject_time
  ON student_spoor_assignments(group_id, school_subject_id, assigned_at DESC);
