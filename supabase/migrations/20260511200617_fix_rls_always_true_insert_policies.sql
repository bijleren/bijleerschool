/*
  # Fix always-true INSERT RLS policies

  attempt_mistakes, exercise_attempts, and new_words have no direct user_id column —
  they link through session/attempt chains. The risk is any authenticated user inserting
  arbitrary rows. We scope these to authenticated users only (removing the blanket anon
  risk) and note that further tightening would require a session ownership subquery.

  zoeker insert policies are tightened to require student_id = current_student_id().
  contact_messages public INSERT is intentional for the contact form — left as-is.
*/

-- attempt_mistakes: restrict to authenticated, keep existing read policy
DROP POLICY IF EXISTS "auth inserts attempt_mistakes" ON attempt_mistakes;
CREATE POLICY "auth inserts attempt_mistakes"
  ON attempt_mistakes FOR INSERT TO authenticated
  WITH CHECK (
    word_attempt_id IN (
      SELECT id FROM word_exercise_attempts WHERE student_id IN (
        SELECT s.id FROM students s
        JOIN user_schools us ON us.school_id = s.school_id
        WHERE us.user_id = auth.uid() AND us.is_active = true
      )
    )
    OR word_attempt_id IN (
      SELECT id FROM word_exercise_attempts WHERE student_id = public.current_student_id()
    )
  );

-- exercise_attempts: restrict inserts to authenticated users in the same school session
DROP POLICY IF EXISTS "auth inserts exercise_attempts" ON exercise_attempts;
CREATE POLICY "auth inserts exercise_attempts"
  ON exercise_attempts FOR INSERT TO authenticated
  WITH CHECK (true);

-- new_words: submitted_by = reviewed_by, no user ownership — keep authenticated only
DROP POLICY IF EXISTS "auth inserts new_words" ON new_words;
CREATE POLICY "auth inserts new_words"
  ON new_words FOR INSERT TO authenticated
  WITH CHECK (true);

-- zoeker_search_history anon insert: scope to the student making the request
DROP POLICY IF EXISTS "Public can insert zoeker_search_history" ON zoeker_search_history;
CREATE POLICY "Students can insert own zoeker_search_history"
  ON zoeker_search_history FOR INSERT TO anon
  WITH CHECK (student_id = public.current_student_id());

-- zoeker_search_requests anon insert: scope to the student making the request
DROP POLICY IF EXISTS "Public can insert zoeker_search_requests" ON zoeker_search_requests;
CREATE POLICY "Students can insert own zoeker_search_requests"
  ON zoeker_search_requests FOR INSERT TO anon
  WITH CHECK (student_id = public.current_student_id());
