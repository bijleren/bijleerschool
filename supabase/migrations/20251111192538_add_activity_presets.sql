/*
  # Add activity presets system

  1. New Tables
    - `activity_presets`
      - `id` (uuid, primary key)
      - `school_id` (uuid, foreign key to schools)
      - `name` (text) - preset name
      - `description` (text, nullable) - optional description
      - `icon` (text) - icon name
      - `color` (text) - hex color code
      - `max_students` (integer, nullable) - max students allowed
      - `is_default` (boolean) - whether it's a system default
      - `created_by` (uuid, foreign key to auth.users)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on `activity_presets` table
    - Teachers can view presets for their school
    - Teachers can create/edit their own presets
    - System defaults (is_default = true) are read-only for all
*/

-- Create activity_presets table
CREATE TABLE IF NOT EXISTS activity_presets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid REFERENCES schools(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  icon text NOT NULL DEFAULT 'Grid',
  color text NOT NULL DEFAULT '#3B82F6',
  max_students integer,
  is_default boolean DEFAULT false,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE activity_presets ENABLE ROW LEVEL SECURITY;

-- Teachers can view presets for their school and system defaults
CREATE POLICY "Teachers can view school presets"
  ON activity_presets FOR SELECT
  TO authenticated
  USING (
    is_default = true OR
    EXISTS (
      SELECT 1 FROM user_schools
      WHERE user_schools.school_id = activity_presets.school_id
      AND user_schools.user_id = auth.uid()
      AND user_schools.status = 'approved'
      AND user_schools.is_active = true
    )
  );

-- Teachers can create presets for their school
CREATE POLICY "Teachers can create presets"
  ON activity_presets FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_schools
      WHERE user_schools.school_id = activity_presets.school_id
      AND user_schools.user_id = auth.uid()
      AND user_schools.status = 'approved'
      AND user_schools.is_active = true
    )
  );

-- Teachers can update their own presets (not defaults)
CREATE POLICY "Teachers can update own presets"
  ON activity_presets FOR UPDATE
  TO authenticated
  USING (
    is_default = false
    AND created_by = auth.uid()
  )
  WITH CHECK (
    is_default = false
    AND created_by = auth.uid()
  );

-- Teachers can delete their own presets (not defaults)
CREATE POLICY "Teachers can delete own presets"
  ON activity_presets FOR DELETE
  TO authenticated
  USING (
    is_default = false
    AND created_by = auth.uid()
  );

-- Insert default presets
INSERT INTO activity_presets (name, icon, color, max_students, is_default, school_id, created_by)
VALUES
  ('Zelfstandig Werken', 'Pencil', '#3B82F6', NULL, true, NULL, NULL),
  ('Lezen', 'Book', '#10B981', NULL, true, NULL, NULL),
  ('Rekenhoek', 'Calculator', '#F59E0B', 4, true, NULL, NULL),
  ('Bouwen', 'Building', '#8B5CF6', 6, true, NULL, NULL),
  ('Knutselen', 'Scissors', '#EC4899', 4, true, NULL, NULL),
  ('Tekenen', 'Palette', '#EF4444', NULL, true, NULL, NULL),
  ('Puzzelen', 'Puzzle', '#06B6D4', 2, true, NULL, NULL),
  ('Muziekhoek', 'Music', '#F97316', 4, true, NULL, NULL),
  ('Spelen', 'Gamepad2', '#84CC16', NULL, true, NULL, NULL)
ON CONFLICT DO NOTHING;
