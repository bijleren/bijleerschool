/*
  # Add Default Reading Techniques Support

  ## Overview
  Add support for default/platform-wide reading techniques similar to interventions.
  Platform admins can create default techniques that all schools can use.

  ## Changes
  1. Add `is_default` column to reading_techniques table
  2. Make `school_id` nullable for default techniques
  3. Update RLS policies to allow access to default techniques
  4. Add index for default techniques

  ## Security
  - Default techniques (is_default = true, school_id = null) are read-only for regular users
  - Schools can only edit/delete their own custom techniques
  - Platform admins can create default techniques
*/

-- Add is_default column to reading_techniques
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'reading_techniques' AND column_name = 'is_default'
  ) THEN
    ALTER TABLE reading_techniques ADD COLUMN is_default boolean DEFAULT false NOT NULL;
  END IF;
END $$;

-- Make school_id nullable for default techniques
ALTER TABLE reading_techniques ALTER COLUMN school_id DROP NOT NULL;

-- Add index for default techniques
CREATE INDEX IF NOT EXISTS idx_reading_techniques_default 
  ON reading_techniques(is_default) 
  WHERE is_default = true;

-- Drop existing RLS policies for reading_techniques
DROP POLICY IF EXISTS "Teachers can view techniques at their school" ON reading_techniques;
DROP POLICY IF EXISTS "Teachers can insert techniques at their school" ON reading_techniques;
DROP POLICY IF EXISTS "Teachers can update techniques at their school" ON reading_techniques;
DROP POLICY IF EXISTS "Teachers can delete techniques at their school" ON reading_techniques;

-- Create new RLS policies with default techniques support
CREATE POLICY "Teachers can view techniques"
  ON reading_techniques FOR SELECT
  TO authenticated
  USING (
    reading_techniques.is_default = true OR EXISTS (
      SELECT 1 FROM user_schools
      WHERE user_schools.user_id = auth.uid()
        AND user_schools.school_id = reading_techniques.school_id
        AND user_schools.status = 'approved'
        AND user_schools.is_active = true
    )
  );

CREATE POLICY "Teachers can insert techniques at their school"
  ON reading_techniques FOR INSERT
  TO authenticated
  WITH CHECK (
    reading_techniques.is_default = false AND EXISTS (
      SELECT 1 FROM user_schools
      WHERE user_schools.user_id = auth.uid()
        AND user_schools.school_id = reading_techniques.school_id
        AND user_schools.status = 'approved'
        AND user_schools.is_active = true
    )
  );

CREATE POLICY "Teachers can update techniques at their school"
  ON reading_techniques FOR UPDATE
  TO authenticated
  USING (
    reading_techniques.is_default = false AND EXISTS (
      SELECT 1 FROM user_schools
      WHERE user_schools.user_id = auth.uid()
        AND user_schools.school_id = reading_techniques.school_id
        AND user_schools.status = 'approved'
        AND user_schools.is_active = true
    )
  );

CREATE POLICY "Teachers can delete techniques at their school"
  ON reading_techniques FOR DELETE
  TO authenticated
  USING (
    reading_techniques.is_default = false AND EXISTS (
      SELECT 1 FROM user_schools
      WHERE user_schools.user_id = auth.uid()
        AND user_schools.school_id = reading_techniques.school_id
        AND user_schools.status = 'approved'
        AND user_schools.is_active = true
    )
  );
