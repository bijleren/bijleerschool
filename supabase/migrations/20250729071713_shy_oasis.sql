/*
  # Fix teachers table RLS infinite recursion

  1. Problem
    - The existing RLS policy for teachers table causes infinite recursion
    - This happens when the policy references related tables in a circular manner

  2. Solution
    - Drop the problematic existing policy
    - Create a simpler, non-recursive policy
    - Allow teachers to read their own profile and profiles from their schools

  3. Changes
    - Remove complex subquery that causes recursion
    - Use simpler conditions that don't create circular references
*/

-- Drop the existing problematic policy
DROP POLICY IF EXISTS "Users can read teachers from their schools" ON teachers;

-- Create a simpler policy that avoids recursion
CREATE POLICY "Teachers can read own and school teachers"
  ON teachers
  FOR SELECT
  TO authenticated
  USING (
    -- Users can read their own teacher profile
    user_id = auth.uid()
    OR
    -- Users can read teachers from schools they belong to (simplified)
    EXISTS (
      SELECT 1 FROM user_schools us1, user_schools us2
      WHERE us1.user_id = auth.uid()
        AND us1.is_active = true
        AND us2.user_id = teachers.user_id
        AND us2.is_active = true
        AND us1.school_id = us2.school_id
    )
  );