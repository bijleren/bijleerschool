/*
  # Fix teammember visibility policies for all user types

  1. Security Changes
    - Drop all existing restrictive policies on teammembers table
    - Create simple, permissive policies that work for all user types
    - Ensure beheerders, leerkrachten, admins, and all users can see teammembers
    
  2. New Policies
    - Users can read own teammember profile
    - School members can read all teammembers in same schools
    - Simplified logic without complex joins
*/

-- Drop all existing policies on teammembers table
DROP POLICY IF EXISTS "School members can read other school members profiles" ON teammembers;
DROP POLICY IF EXISTS "Users can read own teammember profile" ON teammembers;
DROP POLICY IF EXISTS "Users can read own teammember profile v2" ON teammembers;
DROP POLICY IF EXISTS "School members can read all teammembers in same school" ON teammembers;

-- Create simple, permissive policies
CREATE POLICY "Users can read own teammember profile"
  ON teammembers
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "School members can read all teammembers"
  ON teammembers
  FOR SELECT
  TO authenticated
  USING (
    user_id IN (
      SELECT DISTINCT us1.user_id
      FROM user_schools us1
      WHERE us1.school_id IN (
        SELECT us2.school_id
        FROM user_schools us2
        WHERE us2.user_id = auth.uid()
          AND us2.status = 'approved'
          AND us2.is_active = true
      )
      AND us1.status = 'approved'
      AND us1.is_active = true
    )
  );

-- Also ensure users can insert and update their own teammember profile
CREATE POLICY "Users can insert own teammember profile"
  ON teammembers
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own teammember profile"
  ON teammembers
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());