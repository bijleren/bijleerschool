/*
  # Fix infinite recursion in user_schools RLS policy

  1. Policy Changes
    - Drop all existing problematic policies on user_schools
    - Create a simple policy that only allows users to see their own records
    - Create a separate policy for school members using a function to avoid recursion

  2. Security
    - Users can read their own school relationships
    - School members can read other members through a safe function approach
*/

-- Drop all existing policies on user_schools to start fresh
DROP POLICY IF EXISTS "Users can read own school relationships" ON user_schools;
DROP POLICY IF EXISTS "Members can read school relationships" ON user_schools;
DROP POLICY IF EXISTS "School members can read other members" ON user_schools;

-- Create a simple policy for users to read their own records
CREATE POLICY "Users can read own school relationships"
  ON user_schools
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Create a function to safely check if user is school member
CREATE OR REPLACE FUNCTION is_school_member(target_school_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM user_schools 
    WHERE user_id = auth.uid() 
      AND school_id = target_school_id 
      AND status = 'approved' 
      AND is_active = true
  );
$$;

-- Create policy using the function to avoid recursion
CREATE POLICY "School members can read other school members"
  ON user_schools
  FOR SELECT
  TO authenticated
  USING (is_school_member(school_id));