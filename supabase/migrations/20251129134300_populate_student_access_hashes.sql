/*
  # Populate Student Access Hashes
  
  This migration ensures all students have access_hash values for WebWijzer QR code generation.
  
  1. Changes
    - Updates all students without access_hash to have a unique generated hash
    - Adds trigger to auto-generate access_hash for new students
  
  2. Security
    - No RLS changes needed (operates on existing table)
*/

-- Update existing students that don't have an access_hash
UPDATE students
SET access_hash = generate_access_hash()
WHERE access_hash IS NULL;

-- Create trigger to auto-generate access_hash for new students
CREATE OR REPLACE FUNCTION set_student_access_hash()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.access_hash IS NULL THEN
    NEW.access_hash := generate_access_hash();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_set_student_access_hash ON students;
CREATE TRIGGER trigger_set_student_access_hash
  BEFORE INSERT OR UPDATE ON students
  FOR EACH ROW
  EXECUTE FUNCTION set_student_access_hash();
