/*
  # Fix teammember_groups table constraint mismatch

  1. Problem
    - The constraint name references "teacher_groups" but table is "teammember_groups"
    - This is causing confusion and potential issues with duplicate detection

  2. Solution
    - Drop the old constraint with incorrect naming
    - Add new constraint with correct naming
    - Ensure RLS policies are working correctly

  3. Security
    - Maintain existing RLS policies
    - Ensure proper access control for school members
*/

-- Drop the incorrectly named constraint
ALTER TABLE teammember_groups DROP CONSTRAINT IF EXISTS teacher_groups_teacher_id_group_id_key;

-- Add the correctly named constraint
ALTER TABLE teammember_groups ADD CONSTRAINT teammember_groups_teammember_id_group_id_key 
  UNIQUE (teammember_id, group_id);

-- Also ensure the primary key constraint has the correct name
ALTER TABLE teammember_groups DROP CONSTRAINT IF EXISTS teacher_groups_pkey;
ALTER TABLE teammember_groups ADD CONSTRAINT teammember_groups_pkey PRIMARY KEY (id);

-- Update the index names to be consistent
DROP INDEX IF EXISTS teacher_groups_teacher_id_group_id_key;
DROP INDEX IF EXISTS teacher_groups_pkey;
DROP INDEX IF EXISTS idx_teacher_groups_group_id;
DROP INDEX IF EXISTS idx_teacher_groups_teacher_id;

-- Create properly named indexes
CREATE UNIQUE INDEX IF NOT EXISTS teammember_groups_teammember_id_group_id_key 
  ON teammember_groups (teammember_id, group_id);
CREATE UNIQUE INDEX IF NOT EXISTS teammember_groups_pkey 
  ON teammember_groups (id);
CREATE INDEX IF NOT EXISTS idx_teammember_groups_group_id 
  ON teammember_groups (group_id);
CREATE INDEX IF NOT EXISTS idx_teammember_groups_teammember_id 
  ON teammember_groups (teammember_id);