/*
  # Add count_in_analytics to student_roles

  ## Summary
  Adds a boolean column `count_in_analytics` to the `student_roles` table.

  ## Changes
  - `student_roles`: new column `count_in_analytics` (boolean, NOT NULL, DEFAULT true)
    - When true, incidents where the student has this role are included in the student's incident counter
    - All existing roles are set to true (backfilled) to preserve current behavior

  ## Notes
  - Standard value on creation is true (checked by default in the form)
  - Existing roles all get count_in_analytics = true so no analytics change occurs on migration
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'student_roles' AND column_name = 'count_in_analytics'
  ) THEN
    ALTER TABLE student_roles ADD COLUMN count_in_analytics boolean NOT NULL DEFAULT true;
  END IF;
END $$;

-- Backfill all existing roles to true
UPDATE student_roles SET count_in_analytics = true WHERE count_in_analytics IS DISTINCT FROM true;
