/*
  # Add Date Range Limits to WebWijzer Content

  1. Changes
    - Add `available_from` (timestamptz) to webwijzer_content table
    - Add `available_until` (timestamptz) to webwijzer_content table
    - Add `has_date_limit` (boolean) to webwijzer_content table
    
  2. Purpose
    - Allow teachers to set date ranges for content availability
    - Control when students can access specific content
    - Provide time-limited learning materials
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'webwijzer_content' AND column_name = 'has_date_limit'
  ) THEN
    ALTER TABLE webwijzer_content ADD COLUMN has_date_limit boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'webwijzer_content' AND column_name = 'available_from'
  ) THEN
    ALTER TABLE webwijzer_content ADD COLUMN available_from timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'webwijzer_content' AND column_name = 'available_until'
  ) THEN
    ALTER TABLE webwijzer_content ADD COLUMN available_until timestamptz;
  END IF;
END $$;