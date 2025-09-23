/*
  # Update teammember_groups RLS policies

  1. Policy Changes
    - Update INSERT policy to allow school members to add any teammember from their school to groups
    - Ensure proper validation that both the group and teammember belong to schools the user has access to

  2. Security
    - Maintains security by ensuring users can only add teammembers to groups in schools they're members of
    - Validates that the teammember being added is also a member of the same school
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Approved members can insert teammember-group relationships" ON teammember_groups;
DROP POLICY IF EXISTS "Approved members can update teammember-group relationships" ON teammember_groups;
DROP POLICY IF EXISTS "Approved members can delete teammember-group relationships" ON teammember_groups;

-- Create updated policies that allow school members to manage teammember-group relationships
CREATE POLICY "School members can insert teammember-group relationships"
  ON teammember_groups
  FOR INSERT
  TO authenticated
  WITH CHECK (
    -- User must be an approved member of the school that owns the group
    EXISTS (
      SELECT 1
      FROM groups g, user_schools us
      WHERE g.id = teammember_groups.group_id
        AND us.school_id = g.school_id
        AND us.user_id = auth.uid()
        AND us.status = 'approved'
        AND us.is_active = true
    )
    AND
    -- The teammember being added must also be a member of the same school
    EXISTS (
      SELECT 1
      FROM groups g, teammembers t, user_schools us
      WHERE g.id = teammember_groups.group_id
        AND t.id = teammember_groups.teammember_id
        AND us.user_id = t.user_id
        AND us.school_id = g.school_id
        AND us.status = 'approved'
        AND us.is_active = true
    )
  );

CREATE POLICY "School members can update teammember-group relationships"
  ON teammember_groups
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM groups g, user_schools us
      WHERE g.id = teammember_groups.group_id
        AND us.school_id = g.school_id
        AND us.user_id = auth.uid()
        AND us.status = 'approved'
        AND us.is_active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM groups g, user_schools us
      WHERE g.id = teammember_groups.group_id
        AND us.school_id = g.school_id
        AND us.user_id = auth.uid()
        AND us.status = 'approved'
        AND us.is_active = true
    )
  );

CREATE POLICY "School members can delete teammember-group relationships"
  ON teammember_groups
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM groups g, user_schools us
      WHERE g.id = teammember_groups.group_id
        AND us.school_id = g.school_id
        AND us.user_id = auth.uid()
        AND us.status = 'approved'
        AND us.is_active = true
    )
  );

CREATE POLICY "School members can read teammember-group relationships"
  ON teammember_groups
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM groups g, user_schools us
      WHERE g.id = teammember_groups.group_id
        AND us.school_id = g.school_id
        AND us.user_id = auth.uid()
        AND us.status = 'approved'
        AND us.is_active = true
    )
  );