/*
  # Fix user_schools RLS infinite recursion

  1. Problem
    - The existing RLS policies on user_schools table are causing infinite recursion
    - This happens when policies reference the same table they're protecting in subqueries

  2. Solution
    - Drop existing problematic policies
    - Create new, simpler policies that avoid circular references
    - Use direct user ID checks instead of complex subqueries

  3. Security
    - Users can read their own school relationships
    - Users can insert their own join requests (with pending status)
    - Only admins can update requests (approve/reject)
*/

-- Drop existing policies that cause recursion
DROP POLICY IF EXISTS "Users can read school relationships" ON user_schools;
DROP POLICY IF EXISTS "Users can request to join schools" ON user_schools;
DROP POLICY IF EXISTS "Admins can manage requests" ON user_schools;

-- Create new, simple policies without recursion
CREATE POLICY "Users can read own school relationships"
  ON user_schools
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own join requests"
  ON user_schools
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid() 
    AND status = 'pending'
  );

CREATE POLICY "School creators and admins can update requests"
  ON user_schools
  FOR UPDATE
  TO authenticated
  USING (
    -- Allow if user is the school creator
    school_id IN (
      SELECT id FROM schools WHERE created_by = auth.uid()
    )
    OR
    -- Allow if user is an admin of this school (direct check without recursion)
    EXISTS (
      SELECT 1 FROM user_schools us
      WHERE us.school_id = user_schools.school_id
        AND us.user_id = auth.uid()
        AND us.role = 'admin'
        AND us.status = 'approved'
        AND us.is_active = true
    )
  )
  WITH CHECK (
    -- Same conditions for WITH CHECK
    school_id IN (
      SELECT id FROM schools WHERE created_by = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM user_schools us
      WHERE us.school_id = user_schools.school_id
        AND us.user_id = auth.uid()
        AND us.role = 'admin'
        AND us.status = 'approved'
        AND us.is_active = true
    )
  );