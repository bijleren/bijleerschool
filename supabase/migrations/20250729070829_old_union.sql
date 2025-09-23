/*
  # Fix schools table RLS policy for INSERT operations

  1. Security Changes
    - Add INSERT policy for schools table to allow authenticated users to create schools
    - This allows users to create new schools when they don't have an existing school to join

  The policy ensures that any authenticated user can create a school, which is necessary
  for the school creation functionality in the application.
*/

-- Add INSERT policy for schools table
CREATE POLICY "Authenticated users can create schools"
  ON schools
  FOR INSERT
  TO authenticated
  WITH CHECK (true);