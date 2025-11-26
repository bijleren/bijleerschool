/*
  # Allow public read access to FAQs

  1. Changes
    - Drop existing policy that requires authentication
    - Create new policy allowing anyone (including anonymous users) to read published FAQs
    - This enables sharing FAQ links with non-logged-in users

  2. Security
    - Only SELECT operations are allowed publicly
    - Only published FAQs (is_published = true) are visible
    - Write operations still require authentication and admin privileges
*/

-- Drop the existing policy
DROP POLICY IF EXISTS "Users can read published FAQs" ON didactiek_faq;

-- Create new policy for public read access to published FAQs
CREATE POLICY "Public read access to published FAQs"
  ON didactiek_faq
  FOR SELECT
  TO anon, authenticated
  USING (is_published = true);
