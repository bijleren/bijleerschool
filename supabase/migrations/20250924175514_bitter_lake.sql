/*
  # Fix teammember visibility policies

  1. Policy Changes
    - Update teammember policies to allow school members to see all teammembers in same school
    - Ensure proper visibility for group management functionality

  2. Security
    - Maintain RLS protection
    - Only allow viewing teammembers from schools user is approved member of
*/

-- Drop existing restrictive policy
DROP POLICY IF EXISTS "School members can read teammembers in same school" ON teammembers;

-- Create more permissive policy for reading teammembers
CREATE POLICY "School members can read all teammembers in same school"
  ON teammembers
  FOR SELECT
  TO authenticated
  USING (
    user_id IN (
      SELECT us1.user_id
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

-- Also ensure users can always read their own teammember profile
CREATE POLICY "Users can read own teammember profile v2"
  ON teammembers
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());