/*
  # Change teachers to teammembers with approval system

  1. Changes
    - Rename 'teachers' table to 'teammembers'
    - Add 'status' field to user_schools for approval workflow
    - Update RLS policies for new approval system
    - Add policies for pending requests

  2. Security
    - Users can request to join schools
    - Admins can approve/reject requests
    - Only approved members can see school content
*/

-- Add status column to user_schools for approval workflow
ALTER TABLE user_schools ADD COLUMN IF NOT EXISTS status text DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected'));

-- Update existing records to be approved
UPDATE user_schools SET status = 'approved' WHERE status IS NULL OR status = 'pending';

-- Rename teachers table to teammembers
ALTER TABLE teachers RENAME TO teammembers;

-- Update foreign key references
ALTER TABLE teacher_groups RENAME COLUMN teacher_id TO teammember_id;
ALTER TABLE teacher_groups RENAME TO teammember_groups;

-- Update RLS policies for user_schools to handle approval system
DROP POLICY IF EXISTS "Users can read their own school relationships" ON user_schools;
DROP POLICY IF EXISTS "Users can insert their own school relationships" ON user_schools;

-- Users can read their own relationships and admins can see all for their schools
CREATE POLICY "Users can read school relationships" ON user_schools
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid() OR 
    (school_id IN (
      SELECT school_id FROM user_schools 
      WHERE user_id = auth.uid() AND role = 'admin' AND status = 'approved' AND is_active = true
    ))
  );

-- Users can request to join schools
CREATE POLICY "Users can request to join schools" ON user_schools
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND status = 'pending');

-- Admins can update status of requests for their schools
CREATE POLICY "Admins can manage requests" ON user_schools
  FOR UPDATE TO authenticated
  USING (
    school_id IN (
      SELECT school_id FROM user_schools 
      WHERE user_id = auth.uid() AND role = 'admin' AND status = 'approved' AND is_active = true
    )
  )
  WITH CHECK (
    school_id IN (
      SELECT school_id FROM user_schools 
      WHERE user_id = auth.uid() AND role = 'admin' AND status = 'approved' AND is_active = true
    )
  );

-- Update RLS policies for teammembers
DROP POLICY IF EXISTS "Teachers can read own and school teachers" ON teammembers;
DROP POLICY IF EXISTS "Users can insert own teacher profile" ON teammembers;
DROP POLICY IF EXISTS "Users can update own teacher profile" ON teammembers;

CREATE POLICY "Teammembers can read approved school members" ON teammembers
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid() OR 
    (EXISTS (
      SELECT 1 FROM user_schools us1, user_schools us2
      WHERE us1.user_id = auth.uid() 
        AND us1.status = 'approved' 
        AND us1.is_active = true
        AND us2.user_id = teammembers.user_id 
        AND us2.status = 'approved' 
        AND us2.is_active = true
        AND us1.school_id = us2.school_id
    ))
  );

CREATE POLICY "Users can insert own teammember profile" ON teammembers
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own teammember profile" ON teammembers
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

-- Update policies for schools to only allow approved members
DROP POLICY IF EXISTS "users_can_read_accessible_schools" ON schools;
CREATE POLICY "users_can_read_accessible_schools" ON schools
  FOR SELECT TO authenticated
  USING (
    created_by = auth.uid() OR 
    (id IN (
      SELECT school_id FROM user_schools 
      WHERE user_id = auth.uid() AND status = 'approved' AND is_active = true
    ))
  );

-- Update policies for students to only allow approved members
DROP POLICY IF EXISTS "Users can read students from their schools" ON students;
DROP POLICY IF EXISTS "Users can insert students in their schools" ON students;
DROP POLICY IF EXISTS "Users can update students in their schools" ON students;
DROP POLICY IF EXISTS "Users can delete students in their schools" ON students;

CREATE POLICY "Approved members can read students" ON students
  FOR SELECT TO authenticated
  USING (
    school_id IN (
      SELECT school_id FROM user_schools 
      WHERE user_id = auth.uid() AND status = 'approved' AND is_active = true
    )
  );

CREATE POLICY "Approved members can insert students" ON students
  FOR INSERT TO authenticated
  WITH CHECK (
    school_id IN (
      SELECT school_id FROM user_schools 
      WHERE user_id = auth.uid() AND status = 'approved' AND is_active = true
    )
  );

CREATE POLICY "Approved members can update students" ON students
  FOR UPDATE TO authenticated
  USING (
    school_id IN (
      SELECT school_id FROM user_schools 
      WHERE user_id = auth.uid() AND status = 'approved' AND is_active = true
    )
  )
  WITH CHECK (
    school_id IN (
      SELECT school_id FROM user_schools 
      WHERE user_id = auth.uid() AND status = 'approved' AND is_active = true
    )
  );

CREATE POLICY "Approved members can delete students" ON students
  FOR DELETE TO authenticated
  USING (
    school_id IN (
      SELECT school_id FROM user_schools 
      WHERE user_id = auth.uid() AND status = 'approved' AND is_active = true
    )
  );

-- Update policies for groups to only allow approved members
DROP POLICY IF EXISTS "Users can read groups from their schools" ON groups;
DROP POLICY IF EXISTS "Users can insert groups in their schools" ON groups;
DROP POLICY IF EXISTS "Users can update groups in their schools" ON groups;
DROP POLICY IF EXISTS "Users can delete groups in their schools" ON groups;

CREATE POLICY "Approved members can read groups" ON groups
  FOR SELECT TO authenticated
  USING (
    school_id IN (
      SELECT school_id FROM user_schools 
      WHERE user_id = auth.uid() AND status = 'approved' AND is_active = true
    )
  );

CREATE POLICY "Approved members can insert groups" ON groups
  FOR INSERT TO authenticated
  WITH CHECK (
    school_id IN (
      SELECT school_id FROM user_schools 
      WHERE user_id = auth.uid() AND status = 'approved' AND is_active = true
    )
  );

CREATE POLICY "Approved members can update groups" ON groups
  FOR UPDATE TO authenticated
  USING (
    school_id IN (
      SELECT school_id FROM user_schools 
      WHERE user_id = auth.uid() AND status = 'approved' AND is_active = true
    )
  )
  WITH CHECK (
    school_id IN (
      SELECT school_id FROM user_schools 
      WHERE user_id = auth.uid() AND status = 'approved' AND is_active = true
    )
  );

CREATE POLICY "Approved members can delete groups" ON groups
  FOR DELETE TO authenticated
  USING (
    school_id IN (
      SELECT school_id FROM user_schools 
      WHERE user_id = auth.uid() AND status = 'approved' AND is_active = true
    )
  );

-- Update policies for teammember_groups
DROP POLICY IF EXISTS "Users can read teacher-group relationships from their schools" ON teammember_groups;

CREATE POLICY "Approved members can read teammember-group relationships" ON teammember_groups
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM teammembers t, user_schools us, groups g
      WHERE t.id = teammember_groups.teammember_id
        AND us.user_id = t.user_id
        AND us.user_id = auth.uid()
        AND us.status = 'approved'
        AND us.is_active = true
        AND g.id = teammember_groups.group_id
        AND us.school_id = g.school_id
    )
  );

-- Update policies for student_groups
DROP POLICY IF EXISTS "Users can read student-group relationships from their schools" ON student_groups;

CREATE POLICY "Approved members can read student-group relationships" ON student_groups
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM groups g, user_schools us
      WHERE g.id = student_groups.group_id
        AND us.school_id = g.school_id
        AND us.user_id = auth.uid()
        AND us.status = 'approved'
        AND us.is_active = true
    )
  );