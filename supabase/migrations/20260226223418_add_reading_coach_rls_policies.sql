/*
  # Add Reading Coach System - RLS Policies

  ## Security
  - Teachers can only access data for their approved schools
  - Default interventions are visible to all teachers
  - Custom interventions are school-specific
*/

-- RLS Policies for reading_techniques
CREATE POLICY "Teachers can view techniques at their school"
  ON reading_techniques FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_schools
      WHERE user_schools.user_id = auth.uid()
        AND user_schools.school_id = reading_techniques.school_id
        AND user_schools.status = 'approved'
        AND user_schools.is_active = true
    )
  );

CREATE POLICY "Teachers can insert techniques at their school"
  ON reading_techniques FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_schools
      WHERE user_schools.user_id = auth.uid()
        AND user_schools.school_id = reading_techniques.school_id
        AND user_schools.status = 'approved'
        AND user_schools.is_active = true
    )
  );

CREATE POLICY "Teachers can update techniques at their school"
  ON reading_techniques FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_schools
      WHERE user_schools.user_id = auth.uid()
        AND user_schools.school_id = reading_techniques.school_id
        AND user_schools.status = 'approved'
        AND user_schools.is_active = true
    )
  );

CREATE POLICY "Teachers can delete techniques at their school"
  ON reading_techniques FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_schools
      WHERE user_schools.user_id = auth.uid()
        AND user_schools.school_id = reading_techniques.school_id
        AND user_schools.status = 'approved'
        AND user_schools.is_active = true
    )
  );

-- RLS Policies for reading_interventions
CREATE POLICY "Teachers can view interventions"
  ON reading_interventions FOR SELECT
  TO authenticated
  USING (
    reading_interventions.is_default = true OR EXISTS (
      SELECT 1 FROM user_schools
      WHERE user_schools.user_id = auth.uid()
        AND user_schools.school_id = reading_interventions.school_id
        AND user_schools.status = 'approved'
        AND user_schools.is_active = true
    )
  );

CREATE POLICY "Teachers can insert interventions at their school"
  ON reading_interventions FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_schools
      WHERE user_schools.user_id = auth.uid()
        AND user_schools.school_id = reading_interventions.school_id
        AND user_schools.status = 'approved'
        AND user_schools.is_active = true
    )
  );

CREATE POLICY "Teachers can update interventions at their school"
  ON reading_interventions FOR UPDATE
  TO authenticated
  USING (
    reading_interventions.is_default = false AND EXISTS (
      SELECT 1 FROM user_schools
      WHERE user_schools.user_id = auth.uid()
        AND user_schools.school_id = reading_interventions.school_id
        AND user_schools.status = 'approved'
        AND user_schools.is_active = true
    )
  );

CREATE POLICY "Teachers can delete interventions at their school"
  ON reading_interventions FOR DELETE
  TO authenticated
  USING (
    reading_interventions.is_default = false AND EXISTS (
      SELECT 1 FROM user_schools
      WHERE user_schools.user_id = auth.uid()
        AND user_schools.school_id = reading_interventions.school_id
        AND user_schools.status = 'approved'
        AND user_schools.is_active = true
    )
  );

-- RLS Policies for reading_coach_sessions
CREATE POLICY "Teachers can view sessions at their school"
  ON reading_coach_sessions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_schools
      WHERE user_schools.user_id = auth.uid()
        AND user_schools.school_id = reading_coach_sessions.school_id
        AND user_schools.status = 'approved'
        AND user_schools.is_active = true
    )
  );

CREATE POLICY "Teachers can insert sessions at their school"
  ON reading_coach_sessions FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_schools
      WHERE user_schools.user_id = auth.uid()
        AND user_schools.school_id = reading_coach_sessions.school_id
        AND user_schools.status = 'approved'
        AND user_schools.is_active = true
    )
  );

CREATE POLICY "Teachers can update sessions at their school"
  ON reading_coach_sessions FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_schools
      WHERE user_schools.user_id = auth.uid()
        AND user_schools.school_id = reading_coach_sessions.school_id
        AND user_schools.status = 'approved'
        AND user_schools.is_active = true
    )
  );

CREATE POLICY "Teachers can delete sessions at their school"
  ON reading_coach_sessions FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_schools
      WHERE user_schools.user_id = auth.uid()
        AND user_schools.school_id = reading_coach_sessions.school_id
        AND user_schools.status = 'approved'
        AND user_schools.is_active = true
    )
  );

-- RLS Policies for reading_session_techniques
CREATE POLICY "Teachers can view session techniques"
  ON reading_session_techniques FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM reading_coach_sessions rcs
      INNER JOIN user_schools us ON us.school_id = rcs.school_id
      WHERE rcs.id = reading_session_techniques.session_id
        AND us.user_id = auth.uid()
        AND us.status = 'approved'
        AND us.is_active = true
    )
  );

CREATE POLICY "Teachers can insert session techniques"
  ON reading_session_techniques FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM reading_coach_sessions rcs
      INNER JOIN user_schools us ON us.school_id = rcs.school_id
      WHERE rcs.id = reading_session_techniques.session_id
        AND us.user_id = auth.uid()
        AND us.status = 'approved'
        AND us.is_active = true
    )
  );

CREATE POLICY "Teachers can delete session techniques"
  ON reading_session_techniques FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM reading_coach_sessions rcs
      INNER JOIN user_schools us ON us.school_id = rcs.school_id
      WHERE rcs.id = reading_session_techniques.session_id
        AND us.user_id = auth.uid()
        AND us.status = 'approved'
        AND us.is_active = true
    )
  );

-- RLS Policies for reading_session_interventions
CREATE POLICY "Teachers can view session interventions"
  ON reading_session_interventions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM reading_coach_sessions rcs
      INNER JOIN user_schools us ON us.school_id = rcs.school_id
      WHERE rcs.id = reading_session_interventions.session_id
        AND us.user_id = auth.uid()
        AND us.status = 'approved'
        AND us.is_active = true
    )
  );

CREATE POLICY "Teachers can insert session interventions"
  ON reading_session_interventions FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM reading_coach_sessions rcs
      INNER JOIN user_schools us ON us.school_id = rcs.school_id
      WHERE rcs.id = reading_session_interventions.session_id
        AND us.user_id = auth.uid()
        AND us.status = 'approved'
        AND us.is_active = true
    )
  );

CREATE POLICY "Teachers can delete session interventions"
  ON reading_session_interventions FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM reading_coach_sessions rcs
      INNER JOIN user_schools us ON us.school_id = rcs.school_id
      WHERE rcs.id = reading_session_interventions.session_id
        AND us.user_id = auth.uid()
        AND us.status = 'approved'
        AND us.is_active = true
    )
  );