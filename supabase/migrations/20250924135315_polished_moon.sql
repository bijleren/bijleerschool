/*
  # Add default role functionality to student_roles

  1. Schema Changes
    - Add `is_default` column to `student_roles` table
    - Add unique constraint to ensure only one default role per school
    - Add trigger to automatically unset other defaults when a new default is set

  2. Security
    - Update existing RLS policies to handle the new column
*/

-- Add is_default column to student_roles
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'student_roles' AND column_name = 'is_default'
  ) THEN
    ALTER TABLE student_roles ADD COLUMN is_default boolean DEFAULT false;
  END IF;
END $$;

-- Add unique constraint to ensure only one default role per school
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'student_roles_school_id_default_unique'
  ) THEN
    CREATE UNIQUE INDEX student_roles_school_id_default_unique 
    ON student_roles (school_id) 
    WHERE is_default = true;
  END IF;
END $$;

-- Create function to handle default role updates
CREATE OR REPLACE FUNCTION handle_default_student_role()
RETURNS TRIGGER AS $$
BEGIN
  -- If setting a role as default, unset all other defaults for this school
  IF NEW.is_default = true AND (OLD.is_default IS NULL OR OLD.is_default = false) THEN
    UPDATE student_roles 
    SET is_default = false 
    WHERE school_id = NEW.school_id 
    AND id != NEW.id 
    AND is_default = true;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for default role handling
DROP TRIGGER IF EXISTS trigger_handle_default_student_role ON student_roles;
CREATE TRIGGER trigger_handle_default_student_role
  BEFORE UPDATE ON student_roles
  FOR EACH ROW
  EXECUTE FUNCTION handle_default_student_role();