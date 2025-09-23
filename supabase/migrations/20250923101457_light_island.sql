/*
  # Reimagined Teammember System

  1. New Tables
    - `school_teammembers`
      - `id` (uuid, primary key)
      - `school_id` (uuid, foreign key to schools)
      - `user_id` (uuid, foreign key to profiles)
      - `role` (text, 'teacher' or 'admin')
      - `joined_at` (timestamp)
      - `is_active` (boolean)
      - `invited_by` (uuid, nullable, foreign key to profiles)

  2. Security
    - Enable RLS on `school_teammembers` table
    - Add policies for teammembers to read their own school connections
    - Add policies for admins to manage teammembers
    - Add policies for users to join schools with valid codes

  3. Functions
    - Function to join school by code with immediate access
    - Function to check if user is admin of any school
*/

-- Create the new school_teammembers table
CREATE TABLE IF NOT EXISTS school_teammembers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'teacher' CHECK (role IN ('teacher', 'admin')),
  joined_at timestamptz DEFAULT now(),
  is_active boolean DEFAULT true,
  invited_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(school_id, user_id)
);

-- Enable RLS
ALTER TABLE school_teammembers ENABLE ROW LEVEL SECURITY;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_school_teammembers_school_id ON school_teammembers(school_id);
CREATE INDEX IF NOT EXISTS idx_school_teammembers_user_id ON school_teammembers(user_id);
CREATE INDEX IF NOT EXISTS idx_school_teammembers_active ON school_teammembers(school_id, is_active) WHERE is_active = true;

-- Add updated_at trigger
CREATE TRIGGER IF NOT EXISTS update_school_teammembers_updated_at
  BEFORE UPDATE ON school_teammembers
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- RLS Policies

-- Users can read their own school connections
CREATE POLICY "Users can read own school connections"
  ON school_teammembers
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Users can read teammembers of schools they belong to
CREATE POLICY "Teammembers can read school colleagues"
  ON school_teammembers
  FOR SELECT
  TO authenticated
  USING (
    school_id IN (
      SELECT school_id 
      FROM school_teammembers 
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

-- Users can join schools (insert their own connection)
CREATE POLICY "Users can join schools"
  ON school_teammembers
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Admins can manage teammembers in their schools
CREATE POLICY "Admins can manage school teammembers"
  ON school_teammembers
  FOR ALL
  TO authenticated
  USING (
    school_id IN (
      SELECT school_id 
      FROM school_teammembers 
      WHERE user_id = auth.uid() AND role = 'admin' AND is_active = true
    )
  )
  WITH CHECK (
    school_id IN (
      SELECT school_id 
      FROM school_teammembers 
      WHERE user_id = auth.uid() AND role = 'admin' AND is_active = true
    )
  );

-- Function to join school by code
CREATE OR REPLACE FUNCTION join_school_by_code(
  school_code_input text,
  user_id_input uuid DEFAULT auth.uid()
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  school_record schools%ROWTYPE;
  existing_connection school_teammembers%ROWTYPE;
  result json;
BEGIN
  -- Check if user is authenticated
  IF user_id_input IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'User not authenticated');
  END IF;

  -- Find school by code
  SELECT * INTO school_record
  FROM schools
  WHERE school_code = UPPER(school_code_input);

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'School not found');
  END IF;

  -- Check if user is already connected to this school
  SELECT * INTO existing_connection
  FROM school_teammembers
  WHERE school_id = school_record.id AND user_id = user_id_input;

  IF FOUND THEN
    IF existing_connection.is_active THEN
      RETURN json_build_object('success', false, 'error', 'Already connected to this school');
    ELSE
      -- Reactivate existing connection
      UPDATE school_teammembers
      SET is_active = true, joined_at = now()
      WHERE id = existing_connection.id;
      
      RETURN json_build_object(
        'success', true, 
        'message', 'Successfully reconnected to school',
        'school_id', school_record.id,
        'school_name', school_record.name
      );
    END IF;
  END IF;

  -- Create new connection with immediate access
  INSERT INTO school_teammembers (school_id, user_id, role, joined_at, is_active)
  VALUES (school_record.id, user_id_input, 'teacher', now(), true);

  RETURN json_build_object(
    'success', true,
    'message', 'Successfully joined school',
    'school_id', school_record.id,
    'school_name', school_record.name
  );
END;
$$;

-- Function to check if user is admin of any school
CREATE OR REPLACE FUNCTION is_school_admin(
  user_id_input uuid DEFAULT auth.uid(),
  school_id_input uuid DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF user_id_input IS NULL THEN
    RETURN false;
  END IF;

  IF school_id_input IS NOT NULL THEN
    -- Check if user is admin of specific school
    RETURN EXISTS (
      SELECT 1 
      FROM school_teammembers 
      WHERE user_id = user_id_input 
        AND school_id = school_id_input 
        AND role = 'admin' 
        AND is_active = true
    );
  ELSE
    -- Check if user is admin of any school
    RETURN EXISTS (
      SELECT 1 
      FROM school_teammembers 
      WHERE user_id = user_id_input 
        AND role = 'admin' 
        AND is_active = true
    );
  END IF;
END;
$$;

-- Migrate existing data from user_schools to school_teammembers
DO $$
BEGIN
  -- Only migrate if there's data in user_schools and school_teammembers is empty
  IF EXISTS (SELECT 1 FROM user_schools WHERE status = 'approved' AND is_active = true) 
     AND NOT EXISTS (SELECT 1 FROM school_teammembers) THEN
    
    INSERT INTO school_teammembers (school_id, user_id, role, joined_at, is_active)
    SELECT 
      school_id,
      user_id,
      role,
      joined_at,
      is_active
    FROM user_schools
    WHERE status = 'approved' AND is_active = true;
    
  END IF;
END $$;