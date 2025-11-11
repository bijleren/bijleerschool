/*
  # Add School Materials Management System with BlinkQR

  1. New Tables
    - `school_materials`
      - `id` (uuid, primary key)
      - `school_id` (uuid, foreign key to schools)
      - `blink_code` (text) - The BlinkQR code (e.g., "XXXXX-XXXXX")
      - `title` (text) - Material name
      - `description` (text, nullable) - Material description
      - `photo_url` (text, nullable) - Photo storage path
      - `is_available` (boolean) - Whether material is currently available
      - `created_by` (uuid, foreign key to auth.users)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

    - `school_material_loans`
      - `id` (uuid, primary key)
      - `material_id` (uuid, foreign key to school_materials)
      - `student_id` (uuid, foreign key to students)
      - `loaned_at` (timestamptz) - When material was loaned
      - `loaned_by` (uuid, foreign key to auth.users) - Teacher who processed loan
      - `returned_at` (timestamptz, nullable) - When material was returned
      - `returned_by` (uuid, foreign key to auth.users, nullable) - Teacher who processed return
      - `notes` (text, nullable) - Any notes about the loan

  2. Security
    - Enable RLS on both tables
    - Teachers can manage materials for their school
    - Teachers can view and manage loans for their school
*/

-- Create school_materials table
CREATE TABLE IF NOT EXISTS school_materials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid REFERENCES schools(id) ON DELETE CASCADE NOT NULL,
  blink_code text NOT NULL,
  title text NOT NULL,
  description text,
  photo_url text,
  is_available boolean DEFAULT true,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(school_id, blink_code)
);

-- Create school_material_loans table
CREATE TABLE IF NOT EXISTS school_material_loans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  material_id uuid REFERENCES school_materials(id) ON DELETE CASCADE NOT NULL,
  student_id uuid REFERENCES students(id) ON DELETE CASCADE NOT NULL,
  loaned_at timestamptz DEFAULT now(),
  loaned_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  returned_at timestamptz,
  returned_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  notes text
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_school_materials_school_id ON school_materials(school_id);
CREATE INDEX IF NOT EXISTS idx_school_materials_blink_code ON school_materials(blink_code);
CREATE INDEX IF NOT EXISTS idx_school_material_loans_material_id ON school_material_loans(material_id);
CREATE INDEX IF NOT EXISTS idx_school_material_loans_student_id ON school_material_loans(student_id);
CREATE INDEX IF NOT EXISTS idx_school_material_loans_returned_at ON school_material_loans(returned_at);

-- Enable RLS
ALTER TABLE school_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE school_material_loans ENABLE ROW LEVEL SECURITY;

-- RLS Policies for school_materials
CREATE POLICY "Teachers can view school materials"
  ON school_materials FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_schools
      WHERE user_schools.school_id = school_materials.school_id
      AND user_schools.user_id = auth.uid()
      AND user_schools.status = 'approved'
      AND user_schools.is_active = true
    )
  );

CREATE POLICY "Teachers can create materials"
  ON school_materials FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_schools
      WHERE user_schools.school_id = school_materials.school_id
      AND user_schools.user_id = auth.uid()
      AND user_schools.status = 'approved'
      AND user_schools.is_active = true
    )
  );

CREATE POLICY "Teachers can update materials"
  ON school_materials FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_schools
      WHERE user_schools.school_id = school_materials.school_id
      AND user_schools.user_id = auth.uid()
      AND user_schools.status = 'approved'
      AND user_schools.is_active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_schools
      WHERE user_schools.school_id = school_materials.school_id
      AND user_schools.user_id = auth.uid()
      AND user_schools.status = 'approved'
      AND user_schools.is_active = true
    )
  );

CREATE POLICY "Teachers can delete materials"
  ON school_materials FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_schools
      WHERE user_schools.school_id = school_materials.school_id
      AND user_schools.user_id = auth.uid()
      AND user_schools.status = 'approved'
      AND user_schools.is_active = true
    )
  );

-- RLS Policies for school_material_loans
CREATE POLICY "Teachers can view material loans"
  ON school_material_loans FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM school_materials
      JOIN user_schools ON user_schools.school_id = school_materials.school_id
      WHERE school_materials.id = school_material_loans.material_id
      AND user_schools.user_id = auth.uid()
      AND user_schools.status = 'approved'
      AND user_schools.is_active = true
    )
  );

CREATE POLICY "Teachers can create material loans"
  ON school_material_loans FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM school_materials
      JOIN user_schools ON user_schools.school_id = school_materials.school_id
      WHERE school_materials.id = school_material_loans.material_id
      AND user_schools.user_id = auth.uid()
      AND user_schools.status = 'approved'
      AND user_schools.is_active = true
    )
  );

CREATE POLICY "Teachers can update material loans"
  ON school_material_loans FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM school_materials
      JOIN user_schools ON user_schools.school_id = school_materials.school_id
      WHERE school_materials.id = school_material_loans.material_id
      AND user_schools.user_id = auth.uid()
      AND user_schools.status = 'approved'
      AND user_schools.is_active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM school_materials
      JOIN user_schools ON user_schools.school_id = school_materials.school_id
      WHERE school_materials.id = school_material_loans.material_id
      AND user_schools.user_id = auth.uid()
      AND user_schools.status = 'approved'
      AND user_schools.is_active = true
    )
  );
