/*
  # Add activity board filters

  1. Changes
    - Add `time_block` column to activity_boards table for time block selection (text field)
    - Add `student_group_ids` column to activity_boards table for group filtering (array of UUIDs)
    - Add `student_ids` column to activity_boards table for individual student filtering (array of UUIDs)
    
  2. Notes
    - time_block stores a simple text description of the time block (e.g., "09:00 - 10:00", "Blok 1")
    - student_group_ids stores array of student group IDs for filtering
    - student_ids stores array of individual student IDs for filtering
    - All fields are nullable to allow flexible configuration
*/

-- Add time block text column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'activity_boards' AND column_name = 'time_block'
  ) THEN
    ALTER TABLE activity_boards ADD COLUMN time_block text;
  END IF;
END $$;

-- Add student group IDs array column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'activity_boards' AND column_name = 'student_group_ids'
  ) THEN
    ALTER TABLE activity_boards ADD COLUMN student_group_ids uuid[] DEFAULT '{}';
  END IF;
END $$;

-- Add student IDs array column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'activity_boards' AND column_name = 'student_ids'
  ) THEN
    ALTER TABLE activity_boards ADD COLUMN student_ids uuid[] DEFAULT '{}';
  END IF;
END $$;
