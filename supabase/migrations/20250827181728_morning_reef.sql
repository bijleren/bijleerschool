/*
  # Remove unique constraint on behavior items name

  1. Changes
    - Remove the unique constraint on (school_id, name) for behavior_items table
    - This allows multiple behavior items with the same name but different categories/severity levels
    - For example: "Pesten" can exist in both "Licht" and "Ernstig" categories

  2. Security
    - No changes to RLS policies
    - Existing permissions remain the same
*/

-- Remove the unique constraint on behavior items name
-- This allows multiple items with same name but different category/severity combinations
ALTER TABLE behavior_items DROP CONSTRAINT IF EXISTS behavior_items_school_id_name_key;

-- Drop the associated unique index as well
DROP INDEX IF EXISTS behavior_items_school_id_name_key;