/*
  # Create school lesson settings table

  1. New Tables
    - `school_lesson_settings`
      - `id` (uuid, primary key)
      - `school_id` (uuid, foreign key to schools)
      - `start_block_duration` (integer, minutes)
      - `main_block_duration` (integer, minutes) 
      - `end_block_duration` (integer, minutes)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on `school_lesson_settings` table
    - Add policy for school members to manage settings
*/

CREATE TABLE IF NOT EXISTS school_lesson_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  start_block_duration integer NOT NULL DEFAULT 5,
  main_block_duration integer NOT NULL DEFAULT 10,
  end_block_duration integer NOT NULL DEFAULT 5,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(school_id)
);

ALTER TABLE school_lesson_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "School members can manage lesson settings"
  ON school_lesson_settings
  FOR ALL
  TO authenticated
  USING (school_id IN (
    SELECT user_schools.school_id
    FROM user_schools
    WHERE user_schools.user_id = auth.uid()
      AND user_schools.status = 'approved'
      AND user_schools.is_active = true
  ))
  WITH CHECK (school_id IN (
    SELECT user_schools.school_id
    FROM user_schools
    WHERE user_schools.user_id = auth.uid()
      AND user_schools.status = 'approved'
      AND user_schools.is_active = true
  ));

CREATE TRIGGER update_school_lesson_settings_updated_at
  BEFORE UPDATE ON school_lesson_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();