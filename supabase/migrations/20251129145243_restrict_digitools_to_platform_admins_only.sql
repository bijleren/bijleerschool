/*
  # Restrict DigiTools Management to Platform Admins Only
  
  This migration ensures that ONLY admins of the "Bijleren" platform school
  can create, update, or delete digitools. School admins at other schools
  cannot manage digitools.
  
  1. Security Updates
    - Drop existing admin policies
    - Create new policies that check for admin role at the Bijleren school specifically
    - Regular users and school admins can still view tools based on visibility settings
*/

-- Get the Bijleren platform school ID (we'll use it in policies)
-- Note: We use a subquery approach since policies need to be dynamic

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Admins can create digitools" ON digitools;
DROP POLICY IF EXISTS "Admins can update digitools" ON digitools;
DROP POLICY IF EXISTS "Admins can delete digitools" ON digitools;

-- Only PLATFORM admins (admins at Bijleren school) can create digitools
CREATE POLICY "Platform admins can create digitools"
  ON digitools FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_schools us
      JOIN schools s ON s.id = us.school_id
      WHERE us.user_id = auth.uid() 
      AND us.role = 'admin'
      AND us.is_active = true
      AND s.name = 'Bijleren'
    )
  );

-- Only PLATFORM admins can update digitools
CREATE POLICY "Platform admins can update digitools"
  ON digitools FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_schools us
      JOIN schools s ON s.id = us.school_id
      WHERE us.user_id = auth.uid() 
      AND us.role = 'admin'
      AND us.is_active = true
      AND s.name = 'Bijleren'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_schools us
      JOIN schools s ON s.id = us.school_id
      WHERE us.user_id = auth.uid() 
      AND us.role = 'admin'
      AND us.is_active = true
      AND s.name = 'Bijleren'
    )
  );

-- Only PLATFORM admins can delete digitools
CREATE POLICY "Platform admins can delete digitools"
  ON digitools FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_schools us
      JOIN schools s ON s.id = us.school_id
      WHERE us.user_id = auth.uid() 
      AND us.role = 'admin'
      AND us.is_active = true
      AND s.name = 'Bijleren'
    )
  );

-- Also update the admin view policy to be consistent
DROP POLICY IF EXISTS "Admins can view all digitools" ON digitools;

CREATE POLICY "Platform admins can view all digitools"
  ON digitools FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_schools us
      JOIN schools s ON s.id = us.school_id
      WHERE us.user_id = auth.uid() 
      AND us.role = 'admin'
      AND us.is_active = true
      AND s.name = 'Bijleren'
    )
  );
