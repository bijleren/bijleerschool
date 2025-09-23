/*
  # Fix schools table RLS policies

  1. Security Changes
    - Drop existing restrictive policies on schools table
    - Add simple INSERT policy allowing authenticated users to create schools
    - Add SELECT policy for users to read schools they belong to
    - Add UPDATE policy for school admins

  This resolves the "new row violates row-level security policy" error.
*/

-- Drop existing policies that might be causing issues
DROP POLICY IF EXISTS "Allow authenticated users to create schools" ON schools;
DROP POLICY IF EXISTS "Users can read their schools" ON schools;
DROP POLICY IF EXISTS "School admins can update their schools" ON schools;

-- Create simple, working policies
CREATE POLICY "authenticated_can_insert_schools" ON schools
  FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "users_can_read_their_schools" ON schools
  FOR SELECT TO authenticated
  USING (
    id IN (
      SELECT school_id 
      FROM user_schools 
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

CREATE POLICY "admins_can_update_schools" ON schools
  FOR UPDATE TO authenticated
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