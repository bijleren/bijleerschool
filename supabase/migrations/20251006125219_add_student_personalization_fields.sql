/*
  # Add Student Personalization Fields

  1. New Columns
    - `profile_picture_url` (text) - URL/path to uploaded profile picture (PNG or JPG)
    - `color` (text) - Hex color code for student personalization
    - `symbol_url` (text) - URL/path to uploaded symbol file
    - `student_display_number` (integer) - Positive number starting from 1 for student identification
    - `pin_code` (text) - 4-digit PIN code for student (stored as text to preserve leading zeros)

  2. Changes
    - All new fields are nullable to support existing students
    - Added check constraint to ensure student_display_number is positive
    - Added check constraint to ensure pin_code is exactly 4 digits if provided

  3. Security
    - Existing RLS policies will apply to these new fields
*/

-- Add new columns to students table
DO $$
BEGIN
  -- Profile picture URL
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'students' AND column_name = 'profile_picture_url'
  ) THEN
    ALTER TABLE students ADD COLUMN profile_picture_url text;
  END IF;

  -- Color (hex code)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'students' AND column_name = 'color'
  ) THEN
    ALTER TABLE students ADD COLUMN color text;
  END IF;

  -- Symbol URL
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'students' AND column_name = 'symbol_url'
  ) THEN
    ALTER TABLE students ADD COLUMN symbol_url text;
  END IF;

  -- Display number
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'students' AND column_name = 'student_display_number'
  ) THEN
    ALTER TABLE students ADD COLUMN student_display_number integer;
  END IF;

  -- PIN code
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'students' AND column_name = 'pin_code'
  ) THEN
    ALTER TABLE students ADD COLUMN pin_code text;
  END IF;
END $$;

-- Add constraints
DO $$
BEGIN
  -- Ensure student_display_number is positive if provided
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'students_display_number_positive'
  ) THEN
    ALTER TABLE students
      ADD CONSTRAINT students_display_number_positive
      CHECK (student_display_number IS NULL OR student_display_number > 0);
  END IF;

  -- Ensure pin_code is exactly 4 digits if provided
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'students_pin_code_format'
  ) THEN
    ALTER TABLE students
      ADD CONSTRAINT students_pin_code_format
      CHECK (pin_code IS NULL OR pin_code ~ '^[0-9]{4}$');
  END IF;
END $$;