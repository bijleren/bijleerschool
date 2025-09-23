/*
  # Add created_by column to schools table

  1. Schema Changes
    - Add `created_by` column to `schools` table to track who created each school
    - Set up foreign key relationship to profiles table
    - Update RLS policies to allow users to create schools and read schools they created or are members of

  2. Security
    - Enable RLS with proper policies for school creation and access
    - Users can create schools (will be linked to their profile)
    - Users can read schools they created or are members of through user_schools
*/

-- Add created_by column to schools table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'schools' AND column_name = 'created_by'
  ) THEN
    ALTER TABLE schools ADD COLUMN created_by uuid REFERENCES profiles(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Drop existing policies
DROP POLICY IF EXISTS "authenticated_can_insert_schools" ON schools;
DROP POLICY IF EXISTS "users_can_read_their_schools" ON schools;
DROP POLICY IF EXISTS "admins_can_update_schools" ON schools;

-- Create new RLS policies
CREATE POLICY "users_can_create_schools"
  ON schools
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "users_can_read_accessible_schools"
  ON schools
  FOR SELECT
  TO authenticated
  USING (
    created_by = auth.uid() OR
    id IN (
      SELECT school_id 
      FROM user_schools 
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

CREATE POLICY "creators_and_admins_can_update_schools"
  ON schools
  FOR UPDATE
  TO authenticated
  USING (
    created_by = auth.uid() OR
    id IN (
      SELECT school_id 
      FROM user_schools 
      WHERE user_id = auth.uid() AND role = 'admin' AND is_active = true
    )
  )
  WITH CHECK (
    created_by = auth.uid() OR
    id IN (
      SELECT school_id 
      FROM user_schools 
      WHERE user_id = auth.uid() AND role = 'admin' AND is_active = true
    )
  );