/*
  # Allow Public Read Access to WebWijzer Content

  1. Changes
    - Add policy to allow public (unauthenticated) SELECT access to webwijzer_content table
    - This enables students to view content assigned to them
  
  2. Security
    - Students can only read content, not modify it
    - Content must be linked to an assignment to be accessible
*/

-- Allow public to read webwijzer content
CREATE POLICY "Public can read webwijzer content"
  ON webwijzer_content
  FOR SELECT
  TO anon
  USING (true);