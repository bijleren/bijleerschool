/*
  # Add group management policies

  1. New Policies
    - Allow approved school members to manage student-group relationships
    - Allow approved school members to manage teammember-group relationships
  
  2. Security
    - All policies check that user belongs to the school through user_schools table
    - Only approved and active members can manage groups
*/

-- Add policies for student_groups table
CREATE POLICY "Approved members can insert student-group relationships"
  ON student_groups
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM groups g, user_schools us
      WHERE g.id = group_id
        AND us.school_id = g.school_id
        AND us.user_id = auth.uid()
        AND us.status = 'approved'
        AND us.is_active = true
    )
  );

CREATE POLICY "Approved members can update student-group relationships"
  ON student_groups
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM groups g, user_schools us
      WHERE g.id = group_id
        AND us.school_id = g.school_id
        AND us.user_id = auth.uid()
        AND us.status = 'approved'
        AND us.is_active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM groups g, user_schools us
      WHERE g.id = group_id
        AND us.school_id = g.school_id
        AND us.user_id = auth.uid()
        AND us.status = 'approved'
        AND us.is_active = true
    )
  );

CREATE POLICY "Approved members can delete student-group relationships"
  ON student_groups
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM groups g, user_schools us
      WHERE g.id = group_id
        AND us.school_id = g.school_id
        AND us.user_id = auth.uid()
        AND us.status = 'approved'
        AND us.is_active = true
    )
  );

-- Add policies for teammember_groups table
CREATE POLICY "Approved members can insert teammember-group relationships"
  ON teammember_groups
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM groups g, user_schools us
      WHERE g.id = group_id
        AND us.school_id = g.school_id
        AND us.user_id = auth.uid()
        AND us.status = 'approved'
        AND us.is_active = true
    )
  );

CREATE POLICY "Approved members can update teammember-group relationships"
  ON teammember_groups
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM groups g, user_schools us
      WHERE g.id = group_id
        AND us.school_id = g.school_id
        AND us.user_id = auth.uid()
        AND us.status = 'approved'
        AND us.is_active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM groups g, user_schools us
      WHERE g.id = group_id
        AND us.school_id = g.school_id
        AND us.user_id = auth.uid()
        AND us.status = 'approved'
        AND us.is_active = true
    )
  );

CREATE POLICY "Approved members can delete teammember-group relationships"
  ON teammember_groups
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM groups g, user_schools us
      WHERE g.id = group_id
        AND us.school_id = g.school_id
        AND us.user_id = auth.uid()
        AND us.status = 'approved'
        AND us.is_active = true
    )
  );