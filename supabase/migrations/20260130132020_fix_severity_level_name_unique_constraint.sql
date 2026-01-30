/*
  # Fix severity level name unique constraint to exclude inactive records
  
  1. Changes
    - Drop the existing UNIQUE constraint on (school_id, name)
    - Create a partial unique index that only applies to active records
    - This allows deleted level names to be reused without conflicts
  
  2. Impact
    - Allows reuse of severity level names after soft deletion
    - Maintains data integrity for active records only
*/

-- Drop the existing unique constraint
ALTER TABLE behavior_severity_levels 
DROP CONSTRAINT IF EXISTS behavior_severity_levels_school_id_name_key;

-- Create a partial unique index that only applies to active records
CREATE UNIQUE INDEX IF NOT EXISTS behavior_severity_levels_school_id_name_active_key 
ON behavior_severity_levels (school_id, name) 
WHERE is_active = true;