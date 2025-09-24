/*
  # Fix teammember visibility policies

  1. Policy Updates
    - Update teammember policies to allow school members to read other school members
    - Ensure proper visibility for adding teammembers to groups

  2. Security
    - Maintain RLS protection
    - Only allow reading teammembers from same school
*/

-- Drop existing policies that might be too restrictive
DROP POLICY IF EXISTS "Teammembers can read approved school members" ON teammembers;

-- Create new policy that allows school members to read other school members
CREATE POLICY "School members can read teammembers in same school"
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

-- Also ensure users can still read their own teammember profile
CREATE POLICY "Users can read own teammember profile"
  ON teammembers
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());