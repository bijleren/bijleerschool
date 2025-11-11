/*
  # Fix Didactiek FAQ RLS Policies

  1. Changes
    - Remove policies that reference auth.users table directly
    - Add new policies that work with user metadata properly
    - Use auth.jwt() to check user role from metadata

  2. Security
    - Authenticated users can read published FAQs
    - Users with super_admin role in metadata can manage all FAQs
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Users can read published FAQs" ON didactiek_faq;
DROP POLICY IF EXISTS "Super admins can manage FAQs" ON didactiek_faq;

-- Policy: Authenticated users can read published FAQs
CREATE POLICY "Users can read published FAQs"
  ON didactiek_faq FOR SELECT
  TO authenticated
  USING (is_published = true);

-- Policy: Super admins can view all FAQs (published and unpublished)
CREATE POLICY "Super admins can view all FAQs"
  ON didactiek_faq FOR SELECT
  TO authenticated
  USING (
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'super_admin'
  );

-- Policy: Super admins can insert FAQs
CREATE POLICY "Super admins can insert FAQs"
  ON didactiek_faq FOR INSERT
  TO authenticated
  WITH CHECK (
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'super_admin'
  );

-- Policy: Super admins can update FAQs
CREATE POLICY "Super admins can update FAQs"
  ON didactiek_faq FOR UPDATE
  TO authenticated
  USING (
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'super_admin'
  )
  WITH CHECK (
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'super_admin'
  );

-- Policy: Super admins can delete FAQs
CREATE POLICY "Super admins can delete FAQs"
  ON didactiek_faq FOR DELETE
  TO authenticated
  USING (
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'super_admin'
  );
