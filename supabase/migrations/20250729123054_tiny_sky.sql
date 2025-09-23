/*
  # Add grade management and enhance technique usage tracking

  1. New Tables
    - `school_grades` - Manageable grades/levels per school
    - Enhanced `technique_usage_logs` with more data points

  2. Changes
    - Add grade_id to technique_usage_logs
    - Add school_id to technique_usage_logs for better tracking
    - Add time fields for precise tracking
    - Update RLS policies

  3. Sample Data
    - Default Dutch grade levels for existing schools
*/

-- Create school_grades table
CREATE TABLE IF NOT EXISTS school_grades (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  sort_order integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(school_id, name)
);

-- Add indexes for school_grades
CREATE INDEX IF NOT EXISTS idx_school_grades_school_id ON school_grades(school_id);
CREATE INDEX IF NOT EXISTS idx_school_grades_active ON school_grades(school_id, is_active, sort_order) WHERE is_active = true;

-- Enable RLS on school_grades
ALTER TABLE school_grades ENABLE ROW LEVEL SECURITY;

-- RLS policies for school_grades
CREATE POLICY "School members can manage grades"
  ON school_grades
  FOR ALL
  TO authenticated
  USING (
    school_id IN (
      SELECT user_schools.school_id
      FROM user_schools
      WHERE user_schools.user_id = auth.uid()
        AND user_schools.status = 'approved'
        AND user_schools.is_active = true
    )
  )
  WITH CHECK (
    school_id IN (
      SELECT user_schools.school_id
      FROM user_schools
      WHERE user_schools.user_id = auth.uid()
        AND user_schools.status = 'approved'
        AND user_schools.is_active = true
    )
  );

-- Add trigger for updated_at
CREATE TRIGGER update_school_grades_updated_at
  BEFORE UPDATE ON school_grades
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Add new columns to technique_usage_logs
DO $$
BEGIN
  -- Add school_id column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'technique_usage_logs' AND column_name = 'school_id'
  ) THEN
    ALTER TABLE technique_usage_logs ADD COLUMN school_id uuid REFERENCES schools(id) ON DELETE SET NULL;
  END IF;

  -- Add grade_id column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'technique_usage_logs' AND column_name = 'grade_id'
  ) THEN
    ALTER TABLE technique_usage_logs ADD COLUMN grade_id uuid REFERENCES school_grades(id) ON DELETE SET NULL;
  END IF;

  -- Add block_title column for context
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'technique_usage_logs' AND column_name = 'block_title'
  ) THEN
    ALTER TABLE technique_usage_logs ADD COLUMN block_title text;
  END IF;

  -- Add time_of_day column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'technique_usage_logs' AND column_name = 'time_of_day'
  ) THEN
    ALTER TABLE technique_usage_logs ADD COLUMN time_of_day time;
  END IF;
END $$;

-- Add indexes for new columns
CREATE INDEX IF NOT EXISTS idx_technique_usage_logs_school_id ON technique_usage_logs(school_id);
CREATE INDEX IF NOT EXISTS idx_technique_usage_logs_grade_id ON technique_usage_logs(grade_id);

-- Insert default grades for existing schools
INSERT INTO school_grades (school_id, name, description, sort_order)
SELECT 
  s.id,
  grade.name,
  grade.description,
  grade.sort_order
FROM schools s
CROSS JOIN (
  VALUES 
    ('Groep 1', 'Kleuteronderwijs - 4 jaar', 1),
    ('Groep 2', 'Kleuteronderwijs - 5 jaar', 2),
    ('Groep 3', 'Onderbouw - 6 jaar', 3),
    ('Groep 4', 'Onderbouw - 7 jaar', 4),
    ('Groep 5', 'Middenbouw - 8 jaar', 5),
    ('Groep 6', 'Middenbouw - 9 jaar', 6),
    ('Groep 7', 'Bovenbouw - 10 jaar', 7),
    ('Groep 8', 'Bovenbouw - 11 jaar', 8),
    ('Klas 1', 'Voortgezet onderwijs - 12 jaar', 9),
    ('Klas 2', 'Voortgezet onderwijs - 13 jaar', 10),
    ('Klas 3', 'Voortgezet onderwijs - 14 jaar', 11),
    ('Klas 4', 'Voortgezet onderwijs - 15 jaar', 12),
    ('Klas 5', 'Voortgezet onderwijs - 16 jaar', 13),
    ('Klas 6', 'Voortgezet onderwijs - 17 jaar', 14)
) AS grade(name, description, sort_order)
WHERE NOT EXISTS (
  SELECT 1 FROM school_grades sg 
  WHERE sg.school_id = s.id AND sg.name = grade.name
);