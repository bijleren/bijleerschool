/*
  # Add premium school column

  1. Changes
    - Add `premium_school` column to `schools` table
      - Type: integer (0 or 1)
      - Default: 0 (non-premium)
      - Not null
    - This column will be used to determine which schools have access to premium features and apps
  
  2. Notes
    - All existing schools will default to non-premium (0)
    - Premium status can be toggled by updating this column to 1
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'schools' AND column_name = 'premium_school'
  ) THEN
    ALTER TABLE schools ADD COLUMN premium_school integer NOT NULL DEFAULT 0;
  END IF;
END $$;

-- Add a check constraint to ensure only 0 or 1 values
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'schools_premium_school_check'
  ) THEN
    ALTER TABLE schools ADD CONSTRAINT schools_premium_school_check CHECK (premium_school IN (0, 1));
  END IF;
END $$;