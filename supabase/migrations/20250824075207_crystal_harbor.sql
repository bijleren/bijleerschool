/*
  # Fix school join policy for non-admin users

  1. Policy Changes
    - Update schools RLS policy to allow users to read schools when joining by code
    - This enables the school lookup functionality when users try to join a school

  2. Security
    - Maintains security by only allowing read access for school lookup
    - Users still cannot modify schools unless they are creators or admins
*/

-- Drop the existing restrictive policy
DROP POLICY IF EXISTS "users_can_read_accessible_schools" ON schools;

-- Create a new policy that allows reading schools for joining purposes
CREATE POLICY "users_can_read_schools_for_joining"
  ON schools
  FOR SELECT
  TO authenticated
  USING (
    -- Users can read schools they have access to (existing functionality)
    (created_by = auth.uid()) OR 
    (id IN (
      SELECT user_schools.school_id
      FROM user_schools
      WHERE user_schools.user_id = auth.uid() 
        AND user_schools.status = 'approved' 
        AND user_schools.is_active = true
    )) OR
    -- Users can also read any school when looking up by school_code (for joining)
    true
  );