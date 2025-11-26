/*
  # Allow public read access to teaching techniques

  1. Changes
    - Drop existing policy that requires authentication
    - Create new policy allowing anyone (including anonymous users) to read active teaching techniques
    - This enables sharing technique links with non-logged-in users

  2. Security
    - Only SELECT operations are allowed publicly
    - Only active techniques (is_active = true) are visible
    - Write operations still require authentication
*/

-- Drop the existing policy
DROP POLICY IF EXISTS "Everyone can read active teaching techniques" ON teaching_techniques;

-- Create new policy for public read access
CREATE POLICY "Public read access to active teaching techniques"
  ON teaching_techniques
  FOR SELECT
  TO anon, authenticated
  USING (is_active = true);
