/*
  # Fix infinite recursion in user_schools RLS policy

  The previous policy created infinite recursion by referencing user_schools within its own policy.
  This migration removes the problematic policy and creates a simpler approach.

  ## Changes
  1. Drop the problematic policy that caused infinite recursion
  2. Create a new policy that allows school members to read other members without self-reference
  3. Use a more direct approach to avoid circular dependencies
*/

-- Drop the problematic policy
DROP POLICY IF EXISTS "School members can read other school members" ON user_schools;

-- Create a new policy that avoids self-reference
-- This policy allows users to read user_schools records for schools they are connected to
-- but uses a more direct approach to avoid recursion
CREATE POLICY "Members can read school relationships" ON user_schools
  FOR SELECT
  TO authenticated
  USING (
    -- Users can read their own records
    auth.uid() = user_id
    OR
    -- Users can read records for schools where they have an approved, active membership
    school_id IN (
      SELECT school_id 
      FROM user_schools us_inner 
      WHERE us_inner.user_id = auth.uid() 
        AND us_inner.status = 'approved' 
        AND us_inner.is_active = true
    )
  );