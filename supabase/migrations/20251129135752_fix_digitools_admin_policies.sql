/*
  # Fix DigiTools Admin Policies
  
  This migration ensures admin policies work correctly by being more explicit
  about the conditions required for admin access.
  
  1. Updates
    - Update admin policies to check for active admin users
    - Ensure policies are permissive enough for admins to manage tools
*/

-- Drop and recreate admin policies with better conditions
DROP POLICY IF EXISTS "Admins can create digitools" ON digitools;
DROP POLICY IF EXISTS "Admins can update digitools" ON digitools;
DROP POLICY IF EXISTS "Admins can delete digitools" ON digitools;
DROP POLICY IF EXISTS "Admins can view all digitools" ON digitools;

-- Admins can view all digitools
CREATE POLICY "Admins can view all digitools"
  ON digitools FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_schools us
      WHERE us.user_id = auth.uid() 
      AND us.role = 'admin'
      AND us.is_active = true
    )
  );

-- Admins can create digitools
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

-- Admins can update digitools
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

-- Admins can delete digitools
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
