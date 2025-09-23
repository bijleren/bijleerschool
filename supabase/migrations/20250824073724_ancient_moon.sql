/*
  # Admin permissions for technique management

  1. New Tables
    - `admin_users` - Store admin user emails
  
  2. Security Changes
    - Update teaching techniques policies to allow global read access
    - Restrict create/update/delete to admins only
    - Add admin check function
  
  3. Admin Users
    - Add wedsehermans@gmail.com as admin
*/

-- Create admin users table
CREATE TABLE IF NOT EXISTS admin_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

-- Admin users can only be read by authenticated users
CREATE POLICY "Authenticated users can read admin list"
  ON admin_users
  FOR SELECT
  TO authenticated
  USING (true);

-- Only service role can manage admin users
CREATE POLICY "Service role can manage admin users"
  ON admin_users
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Add admin user
INSERT INTO admin_users (email) VALUES ('wedsehermans@gmail.com')
ON CONFLICT (email) DO NOTHING;

-- Create function to check if user is admin
CREATE OR REPLACE FUNCTION is_admin(user_email text)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM admin_users 
    WHERE email = user_email
  );
$$;

-- Create function to check if current user is admin
CREATE OR REPLACE FUNCTION is_current_user_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT is_admin(auth.email());
$$;

-- Update teaching techniques policies
DROP POLICY IF EXISTS "Anyone can read teaching techniques" ON teaching_techniques;
DROP POLICY IF EXISTS "Users can create teaching techniques" ON teaching_techniques;
DROP POLICY IF EXISTS "Users can update own teaching techniques" ON teaching_techniques;
DROP POLICY IF EXISTS "Users can delete own teaching techniques" ON teaching_techniques;

-- Allow everyone to read active techniques
CREATE POLICY "Everyone can read active teaching techniques"
  ON teaching_techniques
  FOR SELECT
  TO authenticated
  USING (is_active = true);

-- Only admins can create techniques
CREATE POLICY "Admins can create teaching techniques"
  ON teaching_techniques
  FOR INSERT
  TO authenticated
  WITH CHECK (is_current_user_admin());

-- Only admins can update techniques
CREATE POLICY "Admins can update teaching techniques"
  ON teaching_techniques
  FOR UPDATE
  TO authenticated
  USING (is_current_user_admin())
  WITH CHECK (is_current_user_admin());

-- Only admins can delete techniques
CREATE POLICY "Admins can delete teaching techniques"
  ON teaching_techniques
  FOR DELETE
  TO authenticated
  USING (is_current_user_admin());

-- Update related tables policies for admin-only management

-- Age groups - admin only management
DROP POLICY IF EXISTS "Authenticated users can manage age groups" ON age_groups;

CREATE POLICY "Everyone can read age groups"
  ON age_groups
  FOR SELECT
  TO authenticated
  USING (is_active = true);

CREATE POLICY "Admins can manage age groups"
  ON age_groups
  FOR ALL
  TO authenticated
  USING (is_current_user_admin())
  WITH CHECK (is_current_user_admin());

-- Subjects - admin only management
DROP POLICY IF EXISTS "Authenticated users can manage subjects" ON subjects;

CREATE POLICY "Everyone can read subjects"
  ON subjects
  FOR SELECT
  TO authenticated
  USING (is_active = true);

CREATE POLICY "Admins can manage subjects"
  ON subjects
  FOR ALL
  TO authenticated
  USING (is_current_user_admin())
  WITH CHECK (is_current_user_admin());

-- Materials - admin only management
DROP POLICY IF EXISTS "Authenticated users can manage materials" ON materials;

CREATE POLICY "Everyone can read materials"
  ON materials
  FOR SELECT
  TO authenticated
  USING (is_active = true);

CREATE POLICY "Admins can manage materials"
  ON materials
  FOR ALL
  TO authenticated
  USING (is_current_user_admin())
  WITH CHECK (is_current_user_admin());

-- Technique categories - admin only management
DROP POLICY IF EXISTS "Authenticated users can manage technique categories" ON technique_categories;

CREATE POLICY "Everyone can read technique categories"
  ON technique_categories
  FOR SELECT
  TO authenticated
  USING (is_active = true);

CREATE POLICY "Admins can manage technique categories"
  ON technique_categories
  FOR ALL
  TO authenticated
  USING (is_current_user_admin())
  WITH CHECK (is_current_user_admin());

-- Update association tables to allow admin-only management
DROP POLICY IF EXISTS "Users can manage technique age groups" ON teaching_technique_age_groups;
DROP POLICY IF EXISTS "Users can manage technique subjects" ON teaching_technique_subjects;
DROP POLICY IF EXISTS "Users can manage technique materials" ON teaching_technique_materials;
DROP POLICY IF EXISTS "Users can manage technique category associations" ON teaching_technique_categories;

CREATE POLICY "Everyone can read technique age groups"
  ON teaching_technique_age_groups
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage technique age groups"
  ON teaching_technique_age_groups
  FOR ALL
  TO authenticated
  USING (is_current_user_admin())
  WITH CHECK (is_current_user_admin());

CREATE POLICY "Everyone can read technique subjects"
  ON teaching_technique_subjects
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage technique subjects"
  ON teaching_technique_subjects
  FOR ALL
  TO authenticated
  USING (is_current_user_admin())
  WITH CHECK (is_current_user_admin());

CREATE POLICY "Everyone can read technique materials"
  ON teaching_technique_materials
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage technique materials"
  ON teaching_technique_materials
  FOR ALL
  TO authenticated
  USING (is_current_user_admin())
  WITH CHECK (is_current_user_admin());

CREATE POLICY "Everyone can read technique category associations"
  ON teaching_technique_categories
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage technique category associations"
  ON teaching_technique_categories
  FOR ALL
  TO authenticated
  USING (is_current_user_admin())
  WITH CHECK (is_current_user_admin());