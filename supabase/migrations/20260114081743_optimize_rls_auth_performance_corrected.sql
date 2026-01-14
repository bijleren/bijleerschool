/*
  # Optimize RLS Auth Performance - Corrected Column Names

  ## Performance Improvements
  - Replace auth.uid() with (select auth.uid()) in RLS policies
  - Prevents re-evaluation of auth functions for each row
  - Significant performance improvement at scale

  ## Changes
  Optimize RLS policies for key tables with correct column names
*/

-- User Schools Policies
DROP POLICY IF EXISTS "Users can read own school relationships" ON user_schools;
CREATE POLICY "Users can read own school relationships"
  ON user_schools
  FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can insert own school associations" ON user_schools;
CREATE POLICY "Users can insert own school associations"
  ON user_schools
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "School creators and admins can update requests" ON user_schools;
CREATE POLICY "School creators and admins can update requests"
  ON user_schools
  FOR UPDATE
  TO authenticated
  USING (
    user_id = (select auth.uid()) OR
    EXISTS (
      SELECT 1 FROM schools
      WHERE schools.id = user_schools.school_id
      AND schools.created_by = (select auth.uid())
    )
  )
  WITH CHECK (
    user_id = (select auth.uid()) OR
    EXISTS (
      SELECT 1 FROM schools
      WHERE schools.id = user_schools.school_id
      AND schools.created_by = (select auth.uid())
    )
  );

-- User Progress Policies
DROP POLICY IF EXISTS "Users can read own progress" ON user_progress;
CREATE POLICY "Users can read own progress"
  ON user_progress
  FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can insert own progress" ON user_progress;
CREATE POLICY "Users can insert own progress"
  ON user_progress
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can update own progress" ON user_progress;
CREATE POLICY "Users can update own progress"
  ON user_progress
  FOR UPDATE
  TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

-- Teammembers Policies
DROP POLICY IF EXISTS "Users can read own teammember profile" ON teammembers;
CREATE POLICY "Users can read own teammember profile"
  ON teammembers
  FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can read own teammember profile v2" ON teammembers;
CREATE POLICY "Users can read own teammember profile v2"
  ON teammembers
  FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can update own teammember profile" ON teammembers;
CREATE POLICY "Users can update own teammember profile"
  ON teammembers
  FOR UPDATE
  TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

-- Behavior Cards Policies
DROP POLICY IF EXISTS "Users can create their own behavior cards" ON behavior_cards;
CREATE POLICY "Users can create their own behavior cards"
  ON behavior_cards
  FOR INSERT
  TO authenticated
  WITH CHECK (created_by_user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can update their own behavior cards" ON behavior_cards;
CREATE POLICY "Users can update their own behavior cards"
  ON behavior_cards
  FOR UPDATE
  TO authenticated
  USING (created_by_user_id = (select auth.uid()))
  WITH CHECK (created_by_user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can delete their own behavior cards" ON behavior_cards;
CREATE POLICY "Users can delete their own behavior cards"
  ON behavior_cards
  FOR DELETE
  TO authenticated
  USING (created_by_user_id = (select auth.uid()));

-- Child Codes Policies
DROP POLICY IF EXISTS "Users can manage codes for their children" ON child_codes;
CREATE POLICY "Users can manage codes for their children"
  ON child_codes
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM children
      WHERE children.id = child_codes.child_id
      AND children.parent_id = (select auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM children
      WHERE children.id = child_codes.child_id
      AND children.parent_id = (select auth.uid())
    )
  );
