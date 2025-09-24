/*
  # Add is_default column to student_roles table

  1. Changes
    - Add `is_default` boolean column to `student_roles` table
    - Set default value to false
    - Add constraint to ensure only one default role per school
    - Create function to automatically unset other defaults when setting a new one

  2. Security
    - No changes to existing RLS policies needed
*/

-- Add the is_default column
ALTER TABLE student_roles 
ADD COLUMN IF NOT EXISTS is_default boolean DEFAULT false;

-- Create a function to ensure only one default role per school
CREATE OR REPLACE FUNCTION ensure_single_default_student_role()
RETURNS TRIGGER AS $$
BEGIN
  -- If the new/updated row has is_default = true
  IF NEW.is_default = true THEN
    -- Set all other roles in the same school to is_default = false
    UPDATE student_roles 
    SET is_default = false 
    WHERE school_id = NEW.school_id 
      AND id != NEW.id 
      AND is_default = true;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to enforce single default role per school
DROP TRIGGER IF EXISTS trigger_ensure_single_default_student_role ON student_roles;
CREATE TRIGGER trigger_ensure_single_default_student_role
  BEFORE INSERT OR UPDATE ON student_roles
  FOR EACH ROW
  EXECUTE FUNCTION ensure_single_default_student_role();