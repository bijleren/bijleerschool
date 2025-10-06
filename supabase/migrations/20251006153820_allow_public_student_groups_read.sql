/*
  # Allow Public Read Access to Student Groups

  1. Changes
    - Add policy to allow public (unauthenticated) SELECT access to student_groups table
    - This enables students to see which groups they belong to when accessing WebWijzer
  
  2. Security
    - Students can only read group memberships, not modify them
    - This is necessary for determining which content is assigned to them via groups
*/

-- Allow public to read student-group relationships
CREATE POLICY "Public can read student groups"
  ON student_groups
  FOR SELECT
  TO anon
  USING (true);
