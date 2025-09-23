/*
  # Fix schools table RLS policies

  1. Security Changes
    - Drop existing restrictive policies on schools table
    - Add proper INSERT policy for authenticated users
    - Add proper SELECT policy for users who belong to schools
    - Add proper UPDATE policy for school admins

  This fixes the "new row violates row-level security policy" error
  when creating schools and ensures proper access control.
*/

-- Drop existing policies that might be too restrictive
DROP POLICY IF EXISTS "Authenticated users can create schools" ON schools;
DROP POLICY IF EXISTS "Users can read schools they belong to" ON schools;

-- Create proper INSERT policy - any authenticated user can create a school
CREATE POLICY "Allow authenticated users to create schools"
  ON schools
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

-- Create proper SELECT policy - users can read schools they belong to
CREATE POLICY "Users can read their schools"
  ON schools
  FOR SELECT
  TO authenticated
  USING (
    id IN (
      SELECT school_id 
      FROM user_schools 
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

-- Create UPDATE policy for school admins
CREATE POLICY "School admins can update their schools"
  ON schools
  FOR UPDATE
  TO authenticated
  USING (
    id IN (
      SELECT school_id 
      FROM user_schools 
      WHERE user_id = auth.uid() 
        AND role = 'admin' 
        AND is_active = true
    )
  )
  WITH CHECK (
    id IN (
      SELECT school_id 
      FROM user_schools 
      WHERE user_id = auth.uid() 
        AND role = 'admin' 
        AND is_active = true
    )
  );