/*
  # Fix newsletters table and RLS policies

  1. Changes
    - Make school_id column nullable (newsletters are global, not school-specific)
    - Drop existing RLS policies
    - Add new policies:
      - Only admins can insert newsletters
      - Only admins can delete newsletters
      - Only users from premium schools (premium_school = 1) can view newsletters
*/

-- Make school_id nullable
ALTER TABLE newsletters ALTER COLUMN school_id DROP NOT NULL;

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view newsletters" ON newsletters;
DROP POLICY IF EXISTS "Admins can insert newsletters" ON newsletters;
DROP POLICY IF EXISTS "Admins can delete newsletters" ON newsletters;
DROP POLICY IF EXISTS "Users can view own school newsletters" ON newsletters;
DROP POLICY IF EXISTS "Authenticated users can view newsletters" ON newsletters;

-- Only admins can insert newsletters
CREATE POLICY "Only admins can insert newsletters"
  ON newsletters FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_schools us
      JOIN schools s ON s.id = us.school_id
      WHERE us.user_id = auth.uid()
        AND us.role = 'admin'
        AND us.is_active = true
    )
  );

-- Only admins can delete newsletters
CREATE POLICY "Only admins can delete newsletters"
  ON newsletters FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_schools us
      JOIN schools s ON s.id = us.school_id
      WHERE us.user_id = auth.uid()
        AND us.role = 'admin'
        AND us.is_active = true
    )
  );

-- Only users from premium schools can view newsletters
CREATE POLICY "Premium school users can view newsletters"
  ON newsletters FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_schools us
      JOIN schools s ON s.id = us.school_id
      WHERE us.user_id = auth.uid()
        AND us.is_active = true
        AND s.premium_school = 1
    )
  );