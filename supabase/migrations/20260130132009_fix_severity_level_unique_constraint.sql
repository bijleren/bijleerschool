/*
  # Fix severity level unique constraint to exclude inactive records
  
  1. Changes
    - Drop the existing UNIQUE constraint on (school_id, level)
    - Create a partial unique index that only applies to active records
    - This allows deleted levels to be reused without conflicts
  
  2. Impact
    - Fixes 409 errors when adding new severity levels after deletion
    - Allows proper reuse of level numbers after soft deletion
*/

-- Drop the existing unique constraint
ALTER TABLE behavior_severity_levels 
DROP CONSTRAINT IF EXISTS behavior_severity_levels_school_id_level_key;

-- Create a partial unique index that only applies to active records
CREATE UNIQUE INDEX IF NOT EXISTS behavior_severity_levels_school_id_level_active_key 
ON behavior_severity_levels (school_id, level) 
WHERE is_active = true;