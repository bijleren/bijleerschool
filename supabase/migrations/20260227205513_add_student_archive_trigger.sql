/*
  # Student Archive Trigger

  ## Summary
  Creates a trigger that automatically moves a student to the archive school
  when their is_active status is set to FALSE.

  ## Changes
  - New trigger function: `archive_student_on_deactivate`
  - New trigger: `trg_archive_student_on_deactivate` on `students` table

  ## Behavior
  When a student's `is_active` column changes from TRUE to FALSE:
  1. `school_id` is set to '117abcca-2b02-4c3e-af50-8bf92ba60d93' (archief school)
  2. `access_hash` is set to NULL (system will regenerate on next access)
  3. `last_name` is replaced with 'archive'

  ## Notes
  - Only fires on UPDATE when is_active transitions from TRUE to FALSE
  - Does not fire if is_active was already FALSE
*/

CREATE OR REPLACE FUNCTION archive_student_on_deactivate()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.is_active = TRUE AND NEW.is_active = FALSE THEN
    NEW.school_id := '117abcca-2b02-4c3e-af50-8bf92ba60d93';
    NEW.access_hash := NULL;
    NEW.last_name := 'archive';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_archive_student_on_deactivate ON students;

CREATE TRIGGER trg_archive_student_on_deactivate
  BEFORE UPDATE ON students
  FOR EACH ROW
  EXECUTE FUNCTION archive_student_on_deactivate();
