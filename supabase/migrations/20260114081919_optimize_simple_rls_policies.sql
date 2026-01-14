/*
  # Optimize Simple RLS Policies

  ## Performance Improvements
  - Replace auth.uid() with (select auth.uid()) in simple RLS policies
  - Focus on policies with direct auth.uid() comparisons
  - Significant performance improvement at scale

  ## Changes
  Optimize policies for tables with verified schema
*/

-- Technique Comments Policies (verified schema)
DROP POLICY IF EXISTS "Users can insert own comments" ON technique_comments;
CREATE POLICY "Users can insert own comments"
  ON technique_comments
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can update own comments" ON technique_comments;
CREATE POLICY "Users can update own comments"
  ON technique_comments
  FOR UPDATE
  TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can delete own comments" ON technique_comments;
CREATE POLICY "Users can delete own comments"
  ON technique_comments
  FOR DELETE
  TO authenticated
  USING (user_id = (select auth.uid()));

-- Study Techniques Policies
DROP POLICY IF EXISTS "Admins can insert study techniques" ON study_techniques;
CREATE POLICY "Admins can insert study techniques"
  ON study_techniques
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM super_admins
      WHERE super_admins.user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Admins can update study techniques" ON study_techniques;
CREATE POLICY "Admins can update study techniques"
  ON study_techniques
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM super_admins
      WHERE super_admins.user_id = (select auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM super_admins
      WHERE super_admins.user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Admins can delete study techniques" ON study_techniques;
CREATE POLICY "Admins can delete study techniques"
  ON study_techniques
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM super_admins
      WHERE super_admins.user_id = (select auth.uid())
    )
  );

-- Study Technique Sessions Policies
DROP POLICY IF EXISTS "Users can view own children's technique sessions" ON study_technique_sessions;
CREATE POLICY "Users can view own children's technique sessions"
  ON study_technique_sessions
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM children
      WHERE children.id = study_technique_sessions.child_id
      AND children.parent_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can create technique sessions for own children" ON study_technique_sessions;
CREATE POLICY "Users can create technique sessions for own children"
  ON study_technique_sessions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM children
      WHERE children.id = study_technique_sessions.child_id
      AND children.parent_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can update own children's technique sessions" ON study_technique_sessions;
CREATE POLICY "Users can update own children's technique sessions"
  ON study_technique_sessions
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM children
      WHERE children.id = study_technique_sessions.child_id
      AND children.parent_id = (select auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM children
      WHERE children.id = study_technique_sessions.child_id
      AND children.parent_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can delete own children's technique sessions" ON study_technique_sessions;
CREATE POLICY "Users can delete own children's technique sessions"
  ON study_technique_sessions
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM children
      WHERE children.id = study_technique_sessions.child_id
      AND children.parent_id = (select auth.uid())
    )
  );

-- Reading Recordings Policies
DROP POLICY IF EXISTS "Users can view own children's reading recordings" ON reading_recordings;
CREATE POLICY "Users can view own children's reading recordings"
  ON reading_recordings
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM children
      WHERE children.id = reading_recordings.child_id
      AND children.parent_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can create reading recordings for own children" ON reading_recordings;
CREATE POLICY "Users can create reading recordings for own children"
  ON reading_recordings
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM children
      WHERE children.id = reading_recordings.child_id
      AND children.parent_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can update own children's reading recordings" ON reading_recordings;
CREATE POLICY "Users can update own children's reading recordings"
  ON reading_recordings
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM children
      WHERE children.id = reading_recordings.child_id
      AND children.parent_id = (select auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM children
      WHERE children.id = reading_recordings.child_id
      AND children.parent_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can delete own children's reading recordings" ON reading_recordings;
CREATE POLICY "Users can delete own children's reading recordings"
  ON reading_recordings
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM children
      WHERE children.id = reading_recordings.child_id
      AND children.parent_id = (select auth.uid())
    )
  );

-- Children Policy
DROP POLICY IF EXISTS "Parents can manage their own children" ON children;
CREATE POLICY "Parents can manage their own children"
  ON children
  FOR ALL
  TO authenticated
  USING (parent_id = (select auth.uid()))
  WITH CHECK (parent_id = (select auth.uid()));

-- Newsletters Policies
DROP POLICY IF EXISTS "Only admins can insert newsletters" ON newsletters;
CREATE POLICY "Only admins can insert newsletters"
  ON newsletters
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM super_admins
      WHERE super_admins.user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Only admins can delete newsletters" ON newsletters;
CREATE POLICY "Only admins can delete newsletters"
  ON newsletters
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM super_admins
      WHERE super_admins.user_id = (select auth.uid())
    )
  );

-- Digitools Policies
DROP POLICY IF EXISTS "Platform admins can view all digitools" ON digitools;
CREATE POLICY "Platform admins can view all digitools"
  ON digitools
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM super_admins
      WHERE super_admins.user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Platform admins can create digitools" ON digitools;
CREATE POLICY "Platform admins can create digitools"
  ON digitools
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM super_admins
      WHERE super_admins.user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Platform admins can update digitools" ON digitools;
CREATE POLICY "Platform admins can update digitools"
  ON digitools
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM super_admins
      WHERE super_admins.user_id = (select auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM super_admins
      WHERE super_admins.user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Platform admins can delete digitools" ON digitools;
CREATE POLICY "Platform admins can delete digitools"
  ON digitools
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM super_admins
      WHERE super_admins.user_id = (select auth.uid())
    )
  );
