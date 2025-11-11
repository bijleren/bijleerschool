/*
  # Fix Didactiek FAQ RLS Policies - Use Admin Function

  1. Changes
    - Remove policies that use JWT metadata
    - Add new policies that use the existing is_current_user_admin() function
    - This aligns with the existing admin system in the database

  2. Security
    - Authenticated users can read published FAQs
    - Admin users (in admin_users table) can manage all FAQs
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Users can read published FAQs" ON didactiek_faq;
DROP POLICY IF EXISTS "Super admins can view all FAQs" ON didactiek_faq;
DROP POLICY IF EXISTS "Super admins can insert FAQs" ON didactiek_faq;
DROP POLICY IF EXISTS "Super admins can update FAQs" ON didactiek_faq;
DROP POLICY IF EXISTS "Super admins can delete FAQs" ON didactiek_faq;

-- Policy: Authenticated users can read published FAQs
CREATE POLICY "Users can read published FAQs"
  ON didactiek_faq FOR SELECT
  TO authenticated
  USING (is_published = true);

-- Policy: Admins can view all FAQs (published and unpublished)
CREATE POLICY "Admins can view all FAQs"
  ON didactiek_faq FOR SELECT
  TO authenticated
  USING (is_current_user_admin());

-- Policy: Admins can insert FAQs
CREATE POLICY "Admins can insert FAQs"
  ON didactiek_faq FOR INSERT
  TO authenticated
  WITH CHECK (is_current_user_admin());

-- Policy: Admins can update FAQs
CREATE POLICY "Admins can update FAQs"
  ON didactiek_faq FOR UPDATE
  TO authenticated
  USING (is_current_user_admin())
  WITH CHECK (is_current_user_admin());

-- Policy: Admins can delete FAQs
CREATE POLICY "Admins can delete FAQs"
  ON didactiek_faq FOR DELETE
  TO authenticated
  USING (is_current_user_admin());
