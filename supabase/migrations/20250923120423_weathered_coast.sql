/*
  # Add profiles access policy for school members

  1. Security
    - Add policy to allow school members to read basic profile info of other school members
    - Uses the existing is_school_member function to check membership
    - Only allows SELECT operations for security

  2. Changes
    - New policy on profiles table: "School members can read other school members profiles"
    - Allows reading first_name, last_name, email of users in the same school
*/

-- Add policy to allow school members to read other school members' profiles
CREATE POLICY "School members can read other school members profiles"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (
    -- Allow if the profile belongs to a user who shares a school with the current user
    id IN (
      SELECT us.user_id
      FROM user_schools us
      WHERE us.school_id IN (
        SELECT us_current.school_id
        FROM user_schools us_current
        WHERE us_current.user_id = auth.uid()
          AND us_current.status = 'approved'
          AND us_current.is_active = true
      )
      AND us.status = 'approved'
      AND us.is_active = true
    )
  );