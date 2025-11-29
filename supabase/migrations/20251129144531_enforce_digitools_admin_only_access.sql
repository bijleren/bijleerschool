/*
  # Enforce Admin-Only Access for DigiTools
  
  This migration ensures that ONLY admins can create, update, or delete digitools
  by enabling FORCE ROW LEVEL SECURITY.
  
  1. Security Updates
    - Enable FORCE ROW LEVEL SECURITY on digitools table
    - This ensures even service role respects RLS policies
    - Only authenticated admins with is_active = true can modify data
*/

-- Force RLS to apply to all roles including table owner
ALTER TABLE digitools FORCE ROW LEVEL SECURITY;

-- Verify policies are correct by recreating them
DROP POLICY IF EXISTS "Admins can create digitools" ON digitools;
DROP POLICY IF EXISTS "Admins can update digitools" ON digitools;
DROP POLICY IF EXISTS "Admins can delete digitools" ON digitools;

-- Only admins can create digitools
CREATE POLICY "Admins can create digitools"
  ON digitools FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_schools us
      WHERE us.user_id = auth.uid() 
      AND us.role = 'admin'
      AND us.is_active = true
    )
  );

-- Only admins can update digitools
CREATE POLICY "Admins can update digitools"
  ON digitools FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_schools us
      WHERE us.user_id = auth.uid() 
      AND us.role = 'admin'
      AND us.is_active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_schools us
      WHERE us.user_id = auth.uid() 
      AND us.role = 'admin'
      AND us.is_active = true
    )
  );

-- Only admins can delete digitools
CREATE POLICY "Admins can delete digitools"
  ON digitools FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_schools us
      WHERE us.user_id = auth.uid() 
      AND us.role = 'admin'
      AND us.is_active = true
    )
  );
