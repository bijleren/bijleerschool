/*
  # Create uid() function and day_templates table

  1. Functions
    - Create `uid()` function to get current user ID from auth context
    - Create `update_updated_at_column()` trigger function

  2. New Tables
    - `day_templates`
      - `id` (uuid, primary key)
      - `name` (text, required)
      - `description` (text, optional)
      - `school_id` (uuid, foreign key to schools)
      - `is_active` (boolean, default true)
      - `created_at` (timestamp)
      - `created_by` (uuid, foreign key to profiles)

  3. Security
    - Enable RLS on `day_templates` table
    - Add policy for school members to manage templates
*/

-- Create uid() function if it doesn't exist
CREATE OR REPLACE FUNCTION uid() 
RETURNS uuid 
LANGUAGE sql 
STABLE
AS $$
  SELECT auth.uid();
$$;

-- Create update_updated_at_column function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create day_templates table
CREATE TABLE IF NOT EXISTS day_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  school_id uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES profiles(id) ON DELETE SET NULL
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_day_templates_school_id ON day_templates(school_id);
CREATE INDEX IF NOT EXISTS idx_day_templates_active ON day_templates(school_id, is_active) WHERE is_active = true;

-- Enable RLS
ALTER TABLE day_templates ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "School members can manage day templates"
  ON day_templates
  FOR ALL
  TO authenticated
  USING (
    school_id IN (
      SELECT user_schools.school_id
      FROM user_schools
      WHERE user_schools.user_id = uid()
        AND user_schools.status = 'approved'
        AND user_schools.is_active = true
    )
  )
  WITH CHECK (
    school_id IN (
      SELECT user_schools.school_id
      FROM user_schools
      WHERE user_schools.user_id = uid()
        AND user_schools.status = 'approved'
        AND user_schools.is_active = true
    )
  );

-- Create trigger for updated_at
CREATE TRIGGER update_day_templates_updated_at
  BEFORE UPDATE ON day_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();