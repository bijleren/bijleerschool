/*
  # Update school day system with manageable subjects

  1. New Tables
    - `school_subjects` - School-specific subjects with title, icon, color
  
  2. Changes
    - Remove `location` column from `day_template_blocks`
    - Add `subject_id` foreign key to `day_template_blocks`
    - Update existing data to use new subject system
  
  3. Security
    - Enable RLS on `school_subjects` table
    - Add policies for school members to manage subjects
*/

-- Create school_subjects table
CREATE TABLE IF NOT EXISTS school_subjects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  title text NOT NULL,
  icon text NOT NULL DEFAULT 'BookOpen',
  color text NOT NULL DEFAULT '#6B7280',
  is_active boolean DEFAULT true,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(school_id, title)
);

-- Enable RLS
ALTER TABLE school_subjects ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "School members can manage subjects"
  ON school_subjects
  FOR ALL
  TO authenticated
  USING (school_id IN (
    SELECT user_schools.school_id
    FROM user_schools
    WHERE user_schools.user_id = uid()
      AND user_schools.status = 'approved'
      AND user_schools.is_active = true
  ))
  WITH CHECK (school_id IN (
    SELECT user_schools.school_id
    FROM user_schools
    WHERE user_schools.user_id = uid()
      AND user_schools.status = 'approved'
      AND user_schools.is_active = true
  ));

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_school_subjects_school_id ON school_subjects(school_id);
CREATE INDEX IF NOT EXISTS idx_school_subjects_active ON school_subjects(school_id, is_active, sort_order);

-- Create trigger for updated_at
CREATE TRIGGER update_school_subjects_updated_at
  BEFORE UPDATE ON school_subjects
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Add subject_id column to day_template_blocks
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'day_template_blocks' AND column_name = 'subject_id'
  ) THEN
    ALTER TABLE day_template_blocks ADD COLUMN subject_id uuid REFERENCES school_subjects(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Remove location column from day_template_blocks
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'day_template_blocks' AND column_name = 'location'
  ) THEN
    ALTER TABLE day_template_blocks DROP COLUMN location;
  END IF;
END $$;

-- Remove subject column from day_template_blocks (we'll use subject_id instead)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'day_template_blocks' AND column_name = 'subject'
  ) THEN
    ALTER TABLE day_template_blocks DROP COLUMN subject;
  END IF;
END $$;

-- Create index for subject_id
CREATE INDEX IF NOT EXISTS idx_day_template_blocks_subject_id ON day_template_blocks(subject_id);

-- Insert default subjects for all existing schools
INSERT INTO school_subjects (school_id, title, icon, color, sort_order)
SELECT 
  s.id as school_id,
  subject_data.title,
  subject_data.icon,
  subject_data.color,
  subject_data.sort_order
FROM schools s
CROSS JOIN (
  VALUES 
    ('Nederlands', 'BookOpen', '#EF4444', 1),
    ('Rekenen/Wiskunde', 'Calculator', '#3B82F6', 2),
    ('Wereldoriëntatie', 'Globe', '#10B981', 3),
    ('Engels', 'Languages', '#8B5CF6', 4),
    ('Geschiedenis', 'Clock', '#F59E0B', 5),
    ('Aardrijkskunde', 'Map', '#06B6D4', 6),
    ('Natuur & Techniek', 'Atom', '#84CC16', 7),
    ('Gym/Sport', 'Zap', '#F97316', 8),
    ('Muziek', 'Music', '#EC4899', 9),
    ('Tekenen/Handvaardigheid', 'Palette', '#6366F1', 10),
    ('Pauze', 'Coffee', '#6B7280', 11),
    ('Lunch', 'Utensils', '#6B7280', 12)
) AS subject_data(title, icon, color, sort_order)
ON CONFLICT (school_id, title) DO NOTHING;

-- Update existing template blocks to use subject_id instead of subject text
UPDATE day_template_blocks 
SET subject_id = ss.id
FROM school_subjects ss
INNER JOIN day_templates dt ON dt.school_id = ss.school_id
WHERE day_template_blocks.template_id = dt.id
  AND day_template_blocks.block_type = 'lesson'
  AND ss.title = CASE 
    WHEN day_template_blocks.title LIKE '%Nederlands%' THEN 'Nederlands'
    WHEN day_template_blocks.title LIKE '%Rekenen%' OR day_template_blocks.title LIKE '%Wiskunde%' THEN 'Rekenen/Wiskunde'
    WHEN day_template_blocks.title LIKE '%Wereldoriëntatie%' THEN 'Wereldoriëntatie'
    WHEN day_template_blocks.title LIKE '%Engels%' THEN 'Engels'
    WHEN day_template_blocks.title LIKE '%Geschiedenis%' THEN 'Geschiedenis'
    WHEN day_template_blocks.title LIKE '%Aardrijkskunde%' THEN 'Aardrijkskunde'
    WHEN day_template_blocks.title LIKE '%Natuur%' OR day_template_blocks.title LIKE '%Techniek%' THEN 'Natuur & Techniek'
    WHEN day_template_blocks.title LIKE '%Gym%' OR day_template_blocks.title LIKE '%Sport%' THEN 'Gym/Sport'
    WHEN day_template_blocks.title LIKE '%Muziek%' THEN 'Muziek'
    WHEN day_template_blocks.title LIKE '%Tekenen%' OR day_template_blocks.title LIKE '%Handvaardigheid%' THEN 'Tekenen/Handvaardigheid'
    ELSE 'Nederlands' -- Default fallback
  END;