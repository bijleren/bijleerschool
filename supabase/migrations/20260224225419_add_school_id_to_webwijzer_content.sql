/*
  # Add school_id to webwijzer_content

  1. Changes
    - Add school_id column to webwijzer_content table
    - Create foreign key constraint to schools table
    - Create index for faster lookups
    - Backfill existing content with school_id from user_schools

  2. Security
    - Update RLS policies to filter by school
*/

-- Add school_id column to webwijzer_content
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'webwijzer_content' AND column_name = 'school_id'
  ) THEN
    ALTER TABLE webwijzer_content ADD COLUMN school_id uuid REFERENCES schools(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Create index for school_id lookups
CREATE INDEX IF NOT EXISTS idx_webwijzer_content_school_id ON webwijzer_content(school_id);

-- Backfill school_id for existing content
UPDATE webwijzer_content wc
SET school_id = us.school_id
FROM user_schools us
WHERE wc.user_id = us.user_id
  AND wc.school_id IS NULL
  AND us.is_active = true
  AND us.status = 'approved';

-- Make school_id NOT NULL after backfilling
ALTER TABLE webwijzer_content ALTER COLUMN school_id SET NOT NULL;

-- Drop old policies
DROP POLICY IF EXISTS "Teachers can view own content" ON webwijzer_content;
DROP POLICY IF EXISTS "Teachers can create content" ON webwijzer_content;
DROP POLICY IF EXISTS "Teachers can update own content" ON webwijzer_content;
DROP POLICY IF EXISTS "Teachers can delete own content" ON webwijzer_content;

-- Create new RLS policies that filter by school
CREATE POLICY "Teachers can view content for their schools"
  ON webwijzer_content FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_schools us
      WHERE us.user_id = auth.uid()
        AND us.school_id = webwijzer_content.school_id
        AND us.is_active = true
        AND us.status = 'approved'
    )
  );

CREATE POLICY "Teachers can create content for their schools"
  ON webwijzer_content FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_schools us
      WHERE us.user_id = auth.uid()
        AND us.school_id = webwijzer_content.school_id
        AND us.is_active = true
        AND us.status = 'approved'
    )
  );

CREATE POLICY "Teachers can update content for their schools"
  ON webwijzer_content FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_schools us
      WHERE us.user_id = auth.uid()
        AND us.school_id = webwijzer_content.school_id
        AND us.is_active = true
        AND us.status = 'approved'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_schools us
      WHERE us.user_id = auth.uid()
        AND us.school_id = webwijzer_content.school_id
        AND us.is_active = true
        AND us.status = 'approved'
    )
  );

CREATE POLICY "Teachers can delete content for their schools"
  ON webwijzer_content FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_schools us
      WHERE us.user_id = auth.uid()
        AND us.school_id = webwijzer_content.school_id
        AND us.is_active = true
        AND us.status = 'approved'
    )
  );
