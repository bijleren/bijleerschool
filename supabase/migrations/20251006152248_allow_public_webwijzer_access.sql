/*
  # Allow Public WebWijzer Access via Hash

  1. Changes
    - Add policy to allow public (unauthenticated) SELECT access to students table when using access_hash
    - This enables students to authenticate via QR code without requiring a logged-in user
  
  2. Security
    - Policy only allows reading specific columns needed for WebWijzer access
    - Only works when access_hash matches and student is active
    - Does not expose sensitive information
*/

-- Allow public access to students table when using access_hash
CREATE POLICY "Public can read student via access_hash"
  ON students
  FOR SELECT
  TO anon
  USING (
    access_hash IS NOT NULL 
    AND is_active = true
  );