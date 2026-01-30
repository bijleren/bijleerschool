/*
  # Allow temporary negative values for level reordering

  Drops the existing CHECK constraint and recreates it to allow negative values
  temporarily during reordering, while still enforcing the 1-5 range for final values.
*/

-- Drop the existing constraint
ALTER TABLE behavior_severity_levels
DROP CONSTRAINT IF EXISTS behavior_severity_levels_level_check;

-- Add new constraint that allows negative temporary values or valid 1-5 range
ALTER TABLE behavior_severity_levels
ADD CONSTRAINT behavior_severity_levels_level_check
CHECK (level < 0 OR (level >= 1 AND level <= 5));
