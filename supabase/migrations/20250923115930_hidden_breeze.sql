/*
  # Update user_schools RLS policy for school member visibility

  1. Policy Changes
    - Add new policy to allow school members to read other school members
    - Keep existing policy for users to read their own relationships
    
  2. Security
    - Users can only see other users within schools they are approved members of
    - Maintains data isolation between different schools
    - Preserves user privacy for non-shared school relationships
*/

-- Drop the existing restrictive policy
DROP POLICY IF EXISTS "Users can read own school relationships" ON user_schools;

-- Create new policy that allows users to read their own relationships
CREATE POLICY "Users can read own school relationships"
  ON user_schools
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Create new policy that allows school members to see other members of the same school
CREATE POLICY "School members can read other school members"
  ON user_schools
  FOR SELECT
  TO authenticated
  USING (
    school_id IN (
      SELECT school_id 
      FROM user_schools 
      WHERE user_id = auth.uid() 
        AND status = 'approved' 
        AND is_active = true
    )
  );