/*
  # Add RLS policies for attempt_mistakes and exercise_attempts

  These tables had their policies dropped in a previous migration but were not
  properly recreated.

  - attempt_mistakes: scoped via word_attempt_id -> word_exercise_attempts.student_id
    -> students.school_id -> user_schools
  - exercise_attempts: no user_id column; restrict to authenticated only
*/

-- ============================================================
-- attempt_mistakes
-- ============================================================
CREATE POLICY "School members can read attempt_mistakes"
  ON public.attempt_mistakes FOR SELECT TO authenticated
  USING (
    word_attempt_id IN (
      SELECT wea.id FROM public.word_exercise_attempts wea
      JOIN public.students s ON s.id = wea.student_id
      JOIN public.user_schools us ON us.school_id = s.school_id
      WHERE us.user_id = auth.uid() AND us.is_active = true
    )
  );

CREATE POLICY "School members can insert attempt_mistakes"
  ON public.attempt_mistakes FOR INSERT TO authenticated
  WITH CHECK (
    word_attempt_id IN (
      SELECT wea.id FROM public.word_exercise_attempts wea
      JOIN public.students s ON s.id = wea.student_id
      JOIN public.user_schools us ON us.school_id = s.school_id
      WHERE us.user_id = auth.uid() AND us.is_active = true
    )
  );

-- ============================================================
-- exercise_attempts (woordenschat math exercises, no user_id)
-- ============================================================
CREATE POLICY "Authenticated can read exercise_attempts"
  ON public.exercise_attempts FOR SELECT TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated can insert exercise_attempts"
  ON public.exercise_attempts FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);
