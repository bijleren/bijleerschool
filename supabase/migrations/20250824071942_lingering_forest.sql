/*
  # Fix user_schools RLS policies

  1. Policy Updates
    - Drop existing INSERT policy that may be faulty
    - Create new INSERT policy for authenticated users
    - Ensure users can insert their own school associations

  2. Security
    - Maintain RLS on user_schools table
    - Allow users to insert records where user_id matches auth.uid()
*/

-- Drop the existing INSERT policy if it exists
DROP POLICY IF EXISTS "Users can insert own join requests" ON user_schools;

-- Create a new INSERT policy that allows users to insert their own records
CREATE POLICY "Users can insert own school associations"
  ON user_schools
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Also ensure the SELECT policy works correctly for reading own records
DROP POLICY IF EXISTS "Users can read own school relationships" ON user_schools;

CREATE POLICY "Users can read own school relationships"
  ON user_schools
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);