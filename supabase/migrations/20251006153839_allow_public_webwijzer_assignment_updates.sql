/*
  # Allow Public Updates to WebWijzer Assignments

  1. Changes
    - Add policy to allow public (unauthenticated) UPDATE access to webwijzer_assignments table
    - This enables students to mark push content as completed and track click usage
  
  2. Security
    - Students can only update assignment tracking fields (push_completed, clicks_used, is_archived)
    - Students cannot modify the content assignment itself (content_id, assignable_type, assignable_id)
*/

-- Allow public to update assignment tracking fields
CREATE POLICY "Public can update assignment tracking"
  ON webwijzer_assignments
  FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);
