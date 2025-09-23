/*
  # Fix students and groups RLS policies for editing

  1. Students Table
    - Add INSERT policy for adding students to schools
    - Add UPDATE policy for editing student information
    - Add DELETE policy for removing students

  2. Groups Table
    - Add INSERT policy for creating groups in schools
    - Add UPDATE policy for editing group information
    - Add DELETE policy for removing groups

  3. Security
    - All policies check that user belongs to the school
    - Maintains data security while allowing proper CRUD operations
*/

-- Drop existing restrictive policies for students
DROP POLICY IF EXISTS "Teachers can manage students in their schools" ON students;
DROP POLICY IF EXISTS "Teachers can read students from their schools" ON students;

-- Add comprehensive students policies
CREATE POLICY "Users can read students from their schools"
  ON students
  FOR SELECT
  TO authenticated
  USING (
    school_id IN (
      SELECT school_id 
      FROM user_schools 
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

CREATE POLICY "Users can insert students in their schools"
  ON students
  FOR INSERT
  TO authenticated
  WITH CHECK (
    school_id IN (
      SELECT school_id 
      FROM user_schools 
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

CREATE POLICY "Users can update students in their schools"
  ON students
  FOR UPDATE
  TO authenticated
  USING (
    school_id IN (
      SELECT school_id 
      FROM user_schools 
      WHERE user_id = auth.uid() AND is_active = true
    )
  )
  WITH CHECK (
    school_id IN (
      SELECT school_id 
      FROM user_schools 
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

CREATE POLICY "Users can delete students in their schools"
  ON students
  FOR DELETE
  TO authenticated
  USING (
    school_id IN (
      SELECT school_id 
      FROM user_schools 
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

-- Drop existing restrictive policies for groups
DROP POLICY IF EXISTS "Users can manage groups in their schools" ON groups;
DROP POLICY IF EXISTS "Users can read groups from their schools" ON groups;

-- Add comprehensive groups policies
CREATE POLICY "Users can read groups from their schools"
  ON groups
  FOR SELECT
  TO authenticated
  USING (
    school_id IN (
      SELECT school_id 
      FROM user_schools 
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

CREATE POLICY "Users can insert groups in their schools"
  ON groups
  FOR INSERT
  TO authenticated
  WITH CHECK (
    school_id IN (
      SELECT school_id 
      FROM user_schools 
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

CREATE POLICY "Users can update groups in their schools"
  ON groups
  FOR UPDATE
  TO authenticated
  USING (
    school_id IN (
      SELECT school_id 
      FROM user_schools 
      WHERE user_id = auth.uid() AND is_active = true
    )
  )
  WITH CHECK (
    school_id IN (
      SELECT school_id 
      FROM user_schools 
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

CREATE POLICY "Users can delete groups in their schools"
  ON groups
  FOR DELETE
  TO authenticated
  USING (
    school_id IN (
      SELECT school_id 
      FROM user_schools 
      WHERE user_id = auth.uid() AND is_active = true
    )
  );