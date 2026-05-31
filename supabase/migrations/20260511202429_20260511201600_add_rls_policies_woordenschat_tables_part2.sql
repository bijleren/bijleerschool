/*
  # Add RLS policies for woordenschat/shared tables (Part 2)

  Covers:
  1. Student-scoped tables (student_id column)
  2. Group-scoped tables (group_id -> groups.school_id)
  3. User-scoped logs and session tables
  4. Miscellaneous remaining tables
*/

-- ============================================================
-- Student-scoped tables (student_id column)
-- Access via school membership join on students table
-- ============================================================

-- assertiveness_exercises
CREATE POLICY "School members can read assertiveness_exercises"
  ON public.assertiveness_exercises FOR SELECT TO authenticated
  USING (
    student_id IN (
      SELECT s.id FROM public.students s
      JOIN public.user_schools us ON us.school_id = s.school_id
      WHERE us.user_id = auth.uid() AND us.is_active = true
    )
  );
CREATE POLICY "School members can insert assertiveness_exercises"
  ON public.assertiveness_exercises FOR INSERT TO authenticated
  WITH CHECK (
    student_id IN (
      SELECT s.id FROM public.students s
      JOIN public.user_schools us ON us.school_id = s.school_id
      WHERE us.user_id = auth.uid() AND us.is_active = true
    )
  );
CREATE POLICY "School members can delete assertiveness_exercises"
  ON public.assertiveness_exercises FOR DELETE TO authenticated
  USING (
    student_id IN (
      SELECT s.id FROM public.students s
      JOIN public.user_schools us ON us.school_id = s.school_id
      WHERE us.user_id = auth.uid() AND us.is_active = true
    )
  );

-- fiches (student_id)
CREATE POLICY "School members can read fiches"
  ON public.fiches FOR SELECT TO authenticated
  USING (
    student_id IN (
      SELECT s.id FROM public.students s
      JOIN public.user_schools us ON us.school_id = s.school_id
      WHERE us.user_id = auth.uid() AND us.is_active = true
    )
  );
CREATE POLICY "School members can insert fiches"
  ON public.fiches FOR INSERT TO authenticated
  WITH CHECK (
    student_id IN (
      SELECT s.id FROM public.students s
      JOIN public.user_schools us ON us.school_id = s.school_id
      WHERE us.user_id = auth.uid() AND us.is_active = true
    )
  );
CREATE POLICY "School members can update fiches"
  ON public.fiches FOR UPDATE TO authenticated
  USING (
    student_id IN (
      SELECT s.id FROM public.students s
      JOIN public.user_schools us ON us.school_id = s.school_id
      WHERE us.user_id = auth.uid() AND us.is_active = true
    )
  )
  WITH CHECK (
    student_id IN (
      SELECT s.id FROM public.students s
      JOIN public.user_schools us ON us.school_id = s.school_id
      WHERE us.user_id = auth.uid() AND us.is_active = true
    )
  );
CREATE POLICY "School members can delete fiches"
  ON public.fiches FOR DELETE TO authenticated
  USING (
    student_id IN (
      SELECT s.id FROM public.students s
      JOIN public.user_schools us ON us.school_id = s.school_id
      WHERE us.user_id = auth.uid() AND us.is_active = true
    )
  );

-- fiche_images (student_id)
CREATE POLICY "School members can read fiche_images"
  ON public.fiche_images FOR SELECT TO authenticated
  USING (
    student_id IN (
      SELECT s.id FROM public.students s
      JOIN public.user_schools us ON us.school_id = s.school_id
      WHERE us.user_id = auth.uid() AND us.is_active = true
    )
  );
CREATE POLICY "School members can insert fiche_images"
  ON public.fiche_images FOR INSERT TO authenticated
  WITH CHECK (
    student_id IN (
      SELECT s.id FROM public.students s
      JOIN public.user_schools us ON us.school_id = s.school_id
      WHERE us.user_id = auth.uid() AND us.is_active = true
    )
  );
CREATE POLICY "School members can delete fiche_images"
  ON public.fiche_images FOR DELETE TO authenticated
  USING (
    student_id IN (
      SELECT s.id FROM public.students s
      JOIN public.user_schools us ON us.school_id = s.school_id
      WHERE us.user_id = auth.uid() AND us.is_active = true
    )
  );

-- learning_activities (student_id)
CREATE POLICY "School members can read learning_activities"
  ON public.learning_activities FOR SELECT TO authenticated
  USING (
    student_id IN (
      SELECT s.id FROM public.students s
      JOIN public.user_schools us ON us.school_id = s.school_id
      WHERE us.user_id = auth.uid() AND us.is_active = true
    )
  );
CREATE POLICY "School members can insert learning_activities"
  ON public.learning_activities FOR INSERT TO authenticated
  WITH CHECK (
    student_id IN (
      SELECT s.id FROM public.students s
      JOIN public.user_schools us ON us.school_id = s.school_id
      WHERE us.user_id = auth.uid() AND us.is_active = true
    )
  );
CREATE POLICY "School members can delete learning_activities"
  ON public.learning_activities FOR DELETE TO authenticated
  USING (
    student_id IN (
      SELECT s.id FROM public.students s
      JOIN public.user_schools us ON us.school_id = s.school_id
      WHERE us.user_id = auth.uid() AND us.is_active = true
    )
  );

-- reading_recordings (student_id)
CREATE POLICY "School members can read reading_recordings"
  ON public.reading_recordings FOR SELECT TO authenticated
  USING (
    student_id IN (
      SELECT s.id FROM public.students s
      JOIN public.user_schools us ON us.school_id = s.school_id
      WHERE us.user_id = auth.uid() AND us.is_active = true
    )
  );
CREATE POLICY "School members can insert reading_recordings"
  ON public.reading_recordings FOR INSERT TO authenticated
  WITH CHECK (
    student_id IN (
      SELECT s.id FROM public.students s
      JOIN public.user_schools us ON us.school_id = s.school_id
      WHERE us.user_id = auth.uid() AND us.is_active = true
    )
  );
CREATE POLICY "School members can delete reading_recordings"
  ON public.reading_recordings FOR DELETE TO authenticated
  USING (
    student_id IN (
      SELECT s.id FROM public.students s
      JOIN public.user_schools us ON us.school_id = s.school_id
      WHERE us.user_id = auth.uid() AND us.is_active = true
    )
  );

-- study_sessions (student_id)
CREATE POLICY "School members can read study_sessions"
  ON public.study_sessions FOR SELECT TO authenticated
  USING (
    student_id IN (
      SELECT s.id FROM public.students s
      JOIN public.user_schools us ON us.school_id = s.school_id
      WHERE us.user_id = auth.uid() AND us.is_active = true
    )
  );
CREATE POLICY "School members can insert study_sessions"
  ON public.study_sessions FOR INSERT TO authenticated
  WITH CHECK (
    student_id IN (
      SELECT s.id FROM public.students s
      JOIN public.user_schools us ON us.school_id = s.school_id
      WHERE us.user_id = auth.uid() AND us.is_active = true
    )
  );
CREATE POLICY "School members can delete study_sessions"
  ON public.study_sessions FOR DELETE TO authenticated
  USING (
    student_id IN (
      SELECT s.id FROM public.students s
      JOIN public.user_schools us ON us.school_id = s.school_id
      WHERE us.user_id = auth.uid() AND us.is_active = true
    )
  );

-- study_technique_sessions (student_id)
CREATE POLICY "School members can read study_technique_sessions"
  ON public.study_technique_sessions FOR SELECT TO authenticated
  USING (
    student_id IN (
      SELECT s.id FROM public.students s
      JOIN public.user_schools us ON us.school_id = s.school_id
      WHERE us.user_id = auth.uid() AND us.is_active = true
    )
  );
CREATE POLICY "School members can insert study_technique_sessions"
  ON public.study_technique_sessions FOR INSERT TO authenticated
  WITH CHECK (
    student_id IN (
      SELECT s.id FROM public.students s
      JOIN public.user_schools us ON us.school_id = s.school_id
      WHERE us.user_id = auth.uid() AND us.is_active = true
    )
  );
CREATE POLICY "School members can delete study_technique_sessions"
  ON public.study_technique_sessions FOR DELETE TO authenticated
  USING (
    student_id IN (
      SELECT s.id FROM public.students s
      JOIN public.user_schools us ON us.school_id = s.school_id
      WHERE us.user_id = auth.uid() AND us.is_active = true
    )
  );

-- text_exercise_recordings (student_id)
CREATE POLICY "School members can read text_exercise_recordings"
  ON public.text_exercise_recordings FOR SELECT TO authenticated
  USING (
    student_id IN (
      SELECT s.id FROM public.students s
      JOIN public.user_schools us ON us.school_id = s.school_id
      WHERE us.user_id = auth.uid() AND us.is_active = true
    )
  );
CREATE POLICY "School members can insert text_exercise_recordings"
  ON public.text_exercise_recordings FOR INSERT TO authenticated
  WITH CHECK (
    student_id IN (
      SELECT s.id FROM public.students s
      JOIN public.user_schools us ON us.school_id = s.school_id
      WHERE us.user_id = auth.uid() AND us.is_active = true
    )
  );
CREATE POLICY "School members can delete text_exercise_recordings"
  ON public.text_exercise_recordings FOR DELETE TO authenticated
  USING (
    student_id IN (
      SELECT s.id FROM public.students s
      JOIN public.user_schools us ON us.school_id = s.school_id
      WHERE us.user_id = auth.uid() AND us.is_active = true
    )
  );

-- topics (student_id)
CREATE POLICY "School members can read topics"
  ON public.topics FOR SELECT TO authenticated
  USING (
    student_id IS NULL
    OR student_id IN (
      SELECT s.id FROM public.students s
      JOIN public.user_schools us ON us.school_id = s.school_id
      WHERE us.user_id = auth.uid() AND us.is_active = true
    )
  );
CREATE POLICY "School members can insert topics"
  ON public.topics FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "School members can delete topics"
  ON public.topics FOR DELETE TO authenticated
  USING (auth.uid() IS NOT NULL);

-- videos (student_id)
CREATE POLICY "School members can read videos"
  ON public.videos FOR SELECT TO authenticated
  USING (
    student_id IS NULL
    OR student_id IN (
      SELECT s.id FROM public.students s
      JOIN public.user_schools us ON us.school_id = s.school_id
      WHERE us.user_id = auth.uid() AND us.is_active = true
    )
  );
CREATE POLICY "Authenticated can insert videos"
  ON public.videos FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated can update videos"
  ON public.videos FOR UPDATE TO authenticated
  USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated can delete videos"
  ON public.videos FOR DELETE TO authenticated USING (auth.uid() IS NOT NULL);

-- video_drawings (student_id)
CREATE POLICY "School members can read video_drawings"
  ON public.video_drawings FOR SELECT TO authenticated
  USING (
    student_id IN (
      SELECT s.id FROM public.students s
      JOIN public.user_schools us ON us.school_id = s.school_id
      WHERE us.user_id = auth.uid() AND us.is_active = true
    )
  );
CREATE POLICY "School members can insert video_drawings"
  ON public.video_drawings FOR INSERT TO authenticated
  WITH CHECK (
    student_id IN (
      SELECT s.id FROM public.students s
      JOIN public.user_schools us ON us.school_id = s.school_id
      WHERE us.user_id = auth.uid() AND us.is_active = true
    )
  );
CREATE POLICY "School members can delete video_drawings"
  ON public.video_drawings FOR DELETE TO authenticated
  USING (
    student_id IN (
      SELECT s.id FROM public.students s
      JOIN public.user_schools us ON us.school_id = s.school_id
      WHERE us.user_id = auth.uid() AND us.is_active = true
    )
  );

-- video_moments (student_id)
CREATE POLICY "School members can read video_moments"
  ON public.video_moments FOR SELECT TO authenticated
  USING (
    student_id IN (
      SELECT s.id FROM public.students s
      JOIN public.user_schools us ON us.school_id = s.school_id
      WHERE us.user_id = auth.uid() AND us.is_active = true
    )
  );
CREATE POLICY "School members can insert video_moments"
  ON public.video_moments FOR INSERT TO authenticated
  WITH CHECK (
    student_id IN (
      SELECT s.id FROM public.students s
      JOIN public.user_schools us ON us.school_id = s.school_id
      WHERE us.user_id = auth.uid() AND us.is_active = true
    )
  );
CREATE POLICY "School members can update video_moments"
  ON public.video_moments FOR UPDATE TO authenticated
  USING (
    student_id IN (
      SELECT s.id FROM public.students s
      JOIN public.user_schools us ON us.school_id = s.school_id
      WHERE us.user_id = auth.uid() AND us.is_active = true
    )
  )
  WITH CHECK (
    student_id IN (
      SELECT s.id FROM public.students s
      JOIN public.user_schools us ON us.school_id = s.school_id
      WHERE us.user_id = auth.uid() AND us.is_active = true
    )
  );
CREATE POLICY "School members can delete video_moments"
  ON public.video_moments FOR DELETE TO authenticated
  USING (
    student_id IN (
      SELECT s.id FROM public.students s
      JOIN public.user_schools us ON us.school_id = s.school_id
      WHERE us.user_id = auth.uid() AND us.is_active = true
    )
  );

-- video_recordings (student_id)
CREATE POLICY "School members can read video_recordings"
  ON public.video_recordings FOR SELECT TO authenticated
  USING (
    student_id IN (
      SELECT s.id FROM public.students s
      JOIN public.user_schools us ON us.school_id = s.school_id
      WHERE us.user_id = auth.uid() AND us.is_active = true
    )
  );
CREATE POLICY "School members can insert video_recordings"
  ON public.video_recordings FOR INSERT TO authenticated
  WITH CHECK (
    student_id IN (
      SELECT s.id FROM public.students s
      JOIN public.user_schools us ON us.school_id = s.school_id
      WHERE us.user_id = auth.uid() AND us.is_active = true
    )
  );
CREATE POLICY "School members can delete video_recordings"
  ON public.video_recordings FOR DELETE TO authenticated
  USING (
    student_id IN (
      SELECT s.id FROM public.students s
      JOIN public.user_schools us ON us.school_id = s.school_id
      WHERE us.user_id = auth.uid() AND us.is_active = true
    )
  );

-- video_technique_logs (student_id)
CREATE POLICY "School members can read video_technique_logs"
  ON public.video_technique_logs FOR SELECT TO authenticated
  USING (
    student_id IN (
      SELECT s.id FROM public.students s
      JOIN public.user_schools us ON us.school_id = s.school_id
      WHERE us.user_id = auth.uid() AND us.is_active = true
    )
  );
CREATE POLICY "School members can insert video_technique_logs"
  ON public.video_technique_logs FOR INSERT TO authenticated
  WITH CHECK (
    student_id IN (
      SELECT s.id FROM public.students s
      JOIN public.user_schools us ON us.school_id = s.school_id
      WHERE us.user_id = auth.uid() AND us.is_active = true
    )
  );

-- video_technique_usage (student_id)
CREATE POLICY "School members can read video_technique_usage"
  ON public.video_technique_usage FOR SELECT TO authenticated
  USING (
    student_id IN (
      SELECT s.id FROM public.students s
      JOIN public.user_schools us ON us.school_id = s.school_id
      WHERE us.user_id = auth.uid() AND us.is_active = true
    )
  );
CREATE POLICY "School members can insert video_technique_usage"
  ON public.video_technique_usage FOR INSERT TO authenticated
  WITH CHECK (
    student_id IN (
      SELECT s.id FROM public.students s
      JOIN public.user_schools us ON us.school_id = s.school_id
      WHERE us.user_id = auth.uid() AND us.is_active = true
    )
  );
CREATE POLICY "School members can update video_technique_usage"
  ON public.video_technique_usage FOR UPDATE TO authenticated
  USING (
    student_id IN (
      SELECT s.id FROM public.students s
      JOIN public.user_schools us ON us.school_id = s.school_id
      WHERE us.user_id = auth.uid() AND us.is_active = true
    )
  )
  WITH CHECK (
    student_id IN (
      SELECT s.id FROM public.students s
      JOIN public.user_schools us ON us.school_id = s.school_id
      WHERE us.user_id = auth.uid() AND us.is_active = true
    )
  );

-- video_word_lists (student_id)
CREATE POLICY "School members can read video_word_lists"
  ON public.video_word_lists FOR SELECT TO authenticated
  USING (
    student_id IN (
      SELECT s.id FROM public.students s
      JOIN public.user_schools us ON us.school_id = s.school_id
      WHERE us.user_id = auth.uid() AND us.is_active = true
    )
  );
CREATE POLICY "School members can insert video_word_lists"
  ON public.video_word_lists FOR INSERT TO authenticated
  WITH CHECK (
    student_id IN (
      SELECT s.id FROM public.students s
      JOIN public.user_schools us ON us.school_id = s.school_id
      WHERE us.user_id = auth.uid() AND us.is_active = true
    )
  );
CREATE POLICY "School members can delete video_word_lists"
  ON public.video_word_lists FOR DELETE TO authenticated
  USING (
    student_id IN (
      SELECT s.id FROM public.students s
      JOIN public.user_schools us ON us.school_id = s.school_id
      WHERE us.user_id = auth.uid() AND us.is_active = true
    )
  );

-- student_tasks (student_id)
CREATE POLICY "School members can read student_tasks"
  ON public.student_tasks FOR SELECT TO authenticated
  USING (
    student_id IN (
      SELECT s.id FROM public.students s
      JOIN public.user_schools us ON us.school_id = s.school_id
      WHERE us.user_id = auth.uid() AND us.is_active = true
    )
  );
CREATE POLICY "School members can insert student_tasks"
  ON public.student_tasks FOR INSERT TO authenticated
  WITH CHECK (
    student_id IN (
      SELECT s.id FROM public.students s
      JOIN public.user_schools us ON us.school_id = s.school_id
      WHERE us.user_id = auth.uid() AND us.is_active = true
    )
  );
CREATE POLICY "School members can update student_tasks"
  ON public.student_tasks FOR UPDATE TO authenticated
  USING (
    student_id IN (
      SELECT s.id FROM public.students s
      JOIN public.user_schools us ON us.school_id = s.school_id
      WHERE us.user_id = auth.uid() AND us.is_active = true
    )
  )
  WITH CHECK (
    student_id IN (
      SELECT s.id FROM public.students s
      JOIN public.user_schools us ON us.school_id = s.school_id
      WHERE us.user_id = auth.uid() AND us.is_active = true
    )
  );
CREATE POLICY "School members can delete student_tasks"
  ON public.student_tasks FOR DELETE TO authenticated
  USING (
    student_id IN (
      SELECT s.id FROM public.students s
      JOIN public.user_schools us ON us.school_id = s.school_id
      WHERE us.user_id = auth.uid() AND us.is_active = true
    )
  );

-- task_completions (student_id)
CREATE POLICY "School members can read task_completions"
  ON public.task_completions FOR SELECT TO authenticated
  USING (
    student_id IN (
      SELECT s.id FROM public.students s
      JOIN public.user_schools us ON us.school_id = s.school_id
      WHERE us.user_id = auth.uid() AND us.is_active = true
    )
  );
CREATE POLICY "School members can insert task_completions"
  ON public.task_completions FOR INSERT TO authenticated
  WITH CHECK (
    student_id IN (
      SELECT s.id FROM public.students s
      JOIN public.user_schools us ON us.school_id = s.school_id
      WHERE us.user_id = auth.uid() AND us.is_active = true
    )
  );

-- student_evaluation_sessions (group_id -> groups.school_id)
CREATE POLICY "School members can read student_evaluation_sessions"
  ON public.student_evaluation_sessions FOR SELECT TO authenticated
  USING (
    group_id IN (
      SELECT id FROM public.groups g
      WHERE g.school_id IN (
        SELECT school_id FROM public.user_schools
        WHERE user_id = auth.uid() AND is_active = true
      )
    )
  );
CREATE POLICY "School members can insert student_evaluation_sessions"
  ON public.student_evaluation_sessions FOR INSERT TO authenticated
  WITH CHECK (
    group_id IN (
      SELECT id FROM public.groups g
      WHERE g.school_id IN (
        SELECT school_id FROM public.user_schools
        WHERE user_id = auth.uid() AND is_active = true
      )
    )
  );
CREATE POLICY "Creators can delete student_evaluation_sessions"
  ON public.student_evaluation_sessions FOR DELETE TO authenticated
  USING (created_by = auth.uid());

-- student_goal_evaluations (student_id)
CREATE POLICY "School members can read student_goal_evaluations"
  ON public.student_goal_evaluations FOR SELECT TO authenticated
  USING (
    student_id IN (
      SELECT s.id FROM public.students s
      JOIN public.user_schools us ON us.school_id = s.school_id
      WHERE us.user_id = auth.uid() AND us.is_active = true
    )
  );
CREATE POLICY "School members can insert student_goal_evaluations"
  ON public.student_goal_evaluations FOR INSERT TO authenticated
  WITH CHECK (
    student_id IN (
      SELECT s.id FROM public.students s
      JOIN public.user_schools us ON us.school_id = s.school_id
      WHERE us.user_id = auth.uid() AND us.is_active = true
    )
  );

-- evaluation_attachments (student_id)
CREATE POLICY "School members can read evaluation_attachments"
  ON public.evaluation_attachments FOR SELECT TO authenticated
  USING (
    student_id IN (
      SELECT s.id FROM public.students s
      JOIN public.user_schools us ON us.school_id = s.school_id
      WHERE us.user_id = auth.uid() AND us.is_active = true
    )
  );
CREATE POLICY "School members can insert evaluation_attachments"
  ON public.evaluation_attachments FOR INSERT TO authenticated
  WITH CHECK (
    student_id IN (
      SELECT s.id FROM public.students s
      JOIN public.user_schools us ON us.school_id = s.school_id
      WHERE us.user_id = auth.uid() AND us.is_active = true
    )
  );
CREATE POLICY "Creators can delete evaluation_attachments"
  ON public.evaluation_attachments FOR DELETE TO authenticated
  USING (created_by = auth.uid());

-- material_feedback (student_id)
CREATE POLICY "School members can read material_feedback"
  ON public.material_feedback FOR SELECT TO authenticated
  USING (
    student_id IN (
      SELECT s.id FROM public.students s
      JOIN public.user_schools us ON us.school_id = s.school_id
      WHERE us.user_id = auth.uid() AND us.is_active = true
    )
  );
CREATE POLICY "School members can insert material_feedback"
  ON public.material_feedback FOR INSERT TO authenticated
  WITH CHECK (
    student_id IN (
      SELECT s.id FROM public.students s
      JOIN public.user_schools us ON us.school_id = s.school_id
      WHERE us.user_id = auth.uid() AND us.is_active = true
    )
  );

-- saved_text_images (via saved_text_id, no direct student_id — authenticated only)
CREATE POLICY "Authenticated can read saved_text_images"
  ON public.saved_text_images FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated can insert saved_text_images"
  ON public.saved_text_images FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated can delete saved_text_images"
  ON public.saved_text_images FOR DELETE TO authenticated USING (auth.uid() IS NOT NULL);

-- ============================================================
-- Group-scoped tables (group_id -> groups.school_id)
-- ============================================================

-- group_routines
CREATE POLICY "School members can read group_routines"
  ON public.group_routines FOR SELECT TO authenticated
  USING (
    group_id IN (
      SELECT id FROM public.groups g
      WHERE g.school_id IN (
        SELECT school_id FROM public.user_schools
        WHERE user_id = auth.uid() AND is_active = true
      )
    )
  );
CREATE POLICY "School members can insert group_routines"
  ON public.group_routines FOR INSERT TO authenticated
  WITH CHECK (
    group_id IN (
      SELECT id FROM public.groups g
      WHERE g.school_id IN (
        SELECT school_id FROM public.user_schools
        WHERE user_id = auth.uid() AND is_active = true
      )
    )
  );
CREATE POLICY "School members can update group_routines"
  ON public.group_routines FOR UPDATE TO authenticated
  USING (
    group_id IN (
      SELECT id FROM public.groups g
      WHERE g.school_id IN (
        SELECT school_id FROM public.user_schools
        WHERE user_id = auth.uid() AND is_active = true
      )
    )
  )
  WITH CHECK (
    group_id IN (
      SELECT id FROM public.groups g
      WHERE g.school_id IN (
        SELECT school_id FROM public.user_schools
        WHERE user_id = auth.uid() AND is_active = true
      )
    )
  );
CREATE POLICY "School members can delete group_routines"
  ON public.group_routines FOR DELETE TO authenticated
  USING (
    group_id IN (
      SELECT id FROM public.groups g
      WHERE g.school_id IN (
        SELECT school_id FROM public.user_schools
        WHERE user_id = auth.uid() AND is_active = true
      )
    )
  );

-- group_goal_progress (group_id -> groups.school_id)
CREATE POLICY "School members can read group_goal_progress"
  ON public.group_goal_progress FOR SELECT TO authenticated
  USING (
    group_id IN (
      SELECT id FROM public.groups g
      WHERE g.school_id IN (
        SELECT school_id FROM public.user_schools
        WHERE user_id = auth.uid() AND is_active = true
      )
    )
  );
CREATE POLICY "School members can insert group_goal_progress"
  ON public.group_goal_progress FOR INSERT TO authenticated
  WITH CHECK (
    group_id IN (
      SELECT id FROM public.groups g
      WHERE g.school_id IN (
        SELECT school_id FROM public.user_schools
        WHERE user_id = auth.uid() AND is_active = true
      )
    )
  );
CREATE POLICY "School members can update group_goal_progress"
  ON public.group_goal_progress FOR UPDATE TO authenticated
  USING (
    group_id IN (
      SELECT id FROM public.groups g
      WHERE g.school_id IN (
        SELECT school_id FROM public.user_schools
        WHERE user_id = auth.uid() AND is_active = true
      )
    )
  )
  WITH CHECK (
    group_id IN (
      SELECT id FROM public.groups g
      WHERE g.school_id IN (
        SELECT school_id FROM public.user_schools
        WHERE user_id = auth.uid() AND is_active = true
      )
    )
  );

-- group_onboarding_progress (user_id)
CREATE POLICY "Users can read own group_onboarding_progress"
  ON public.group_onboarding_progress FOR SELECT TO authenticated
  USING (user_id = auth.uid());
CREATE POLICY "Users can insert own group_onboarding_progress"
  ON public.group_onboarding_progress FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own group_onboarding_progress"
  ON public.group_onboarding_progress FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- game_sessions (group_id -> groups.school_id)
CREATE POLICY "School members can read game_sessions"
  ON public.game_sessions FOR SELECT TO authenticated
  USING (
    group_id IN (
      SELECT id FROM public.groups g
      WHERE g.school_id IN (
        SELECT school_id FROM public.user_schools
        WHERE user_id = auth.uid() AND is_active = true
      )
    )
  );
CREATE POLICY "School members can insert game_sessions"
  ON public.game_sessions FOR INSERT TO authenticated
  WITH CHECK (
    group_id IN (
      SELECT id FROM public.groups g
      WHERE g.school_id IN (
        SELECT school_id FROM public.user_schools
        WHERE user_id = auth.uid() AND is_active = true
      )
    )
  );

-- goal_tracking_sessions (group_id -> groups.school_id)
CREATE POLICY "School members can read goal_tracking_sessions"
  ON public.goal_tracking_sessions FOR SELECT TO authenticated
  USING (
    group_id IN (
      SELECT id FROM public.groups g
      WHERE g.school_id IN (
        SELECT school_id FROM public.user_schools
        WHERE user_id = auth.uid() AND is_active = true
      )
    )
  );
CREATE POLICY "School members can insert goal_tracking_sessions"
  ON public.goal_tracking_sessions FOR INSERT TO authenticated
  WITH CHECK (
    group_id IN (
      SELECT id FROM public.groups g
      WHERE g.school_id IN (
        SELECT school_id FROM public.user_schools
        WHERE user_id = auth.uid() AND is_active = true
      )
    )
  );

-- vocabulary_practice_log (group_id -> groups.school_id)
CREATE POLICY "School members can read vocabulary_practice_log"
  ON public.vocabulary_practice_log FOR SELECT TO authenticated
  USING (
    group_id IN (
      SELECT id FROM public.groups g
      WHERE g.school_id IN (
        SELECT school_id FROM public.user_schools
        WHERE user_id = auth.uid() AND is_active = true
      )
    )
  );
CREATE POLICY "School members can insert vocabulary_practice_log"
  ON public.vocabulary_practice_log FOR INSERT TO authenticated
  WITH CHECK (
    group_id IN (
      SELECT id FROM public.groups g
      WHERE g.school_id IN (
        SELECT school_id FROM public.user_schools
        WHERE user_id = auth.uid() AND is_active = true
      )
    )
  );

-- writing_practice_log (group_id -> groups.school_id)
CREATE POLICY "School members can read writing_practice_log"
  ON public.writing_practice_log FOR SELECT TO authenticated
  USING (
    group_id IN (
      SELECT id FROM public.groups g
      WHERE g.school_id IN (
        SELECT school_id FROM public.user_schools
        WHERE user_id = auth.uid() AND is_active = true
      )
    )
  );
CREATE POLICY "School members can insert writing_practice_log"
  ON public.writing_practice_log FOR INSERT TO authenticated
  WITH CHECK (
    group_id IN (
      SELECT id FROM public.groups g
      WHERE g.school_id IN (
        SELECT school_id FROM public.user_schools
        WHERE user_id = auth.uid() AND is_active = true
      )
    )
  );

-- educational_material_sessions (group_id -> groups.school_id)
CREATE POLICY "School members can read educational_material_sessions"
  ON public.educational_material_sessions FOR SELECT TO authenticated
  USING (
    group_id IN (
      SELECT id FROM public.groups g
      WHERE g.school_id IN (
        SELECT school_id FROM public.user_schools
        WHERE user_id = auth.uid() AND is_active = true
      )
    )
  );
CREATE POLICY "School members can insert educational_material_sessions"
  ON public.educational_material_sessions FOR INSERT TO authenticated
  WITH CHECK (
    group_id IN (
      SELECT id FROM public.groups g
      WHERE g.school_id IN (
        SELECT school_id FROM public.user_schools
        WHERE user_id = auth.uid() AND is_active = true
      )
    )
  );

-- educational_video_sessions (group_id -> groups.school_id)
CREATE POLICY "School members can read educational_video_sessions"
  ON public.educational_video_sessions FOR SELECT TO authenticated
  USING (
    group_id IN (
      SELECT id FROM public.groups g
      WHERE g.school_id IN (
        SELECT school_id FROM public.user_schools
        WHERE user_id = auth.uid() AND is_active = true
      )
    )
  );
CREATE POLICY "School members can insert educational_video_sessions"
  ON public.educational_video_sessions FOR INSERT TO authenticated
  WITH CHECK (
    group_id IN (
      SELECT id FROM public.groups g
      WHERE g.school_id IN (
        SELECT school_id FROM public.user_schools
        WHERE user_id = auth.uid() AND is_active = true
      )
    )
  );

-- routine_logs (group_id -> groups.school_id)
CREATE POLICY "School members can read routine_logs"
  ON public.routine_logs FOR SELECT TO authenticated
  USING (
    group_id IN (
      SELECT id FROM public.groups g
      WHERE g.school_id IN (
        SELECT school_id FROM public.user_schools
        WHERE user_id = auth.uid() AND is_active = true
      )
    )
  );
CREATE POLICY "School members can insert routine_logs"
  ON public.routine_logs FOR INSERT TO authenticated
  WITH CHECK (
    group_id IN (
      SELECT id FROM public.groups g
      WHERE g.school_id IN (
        SELECT school_id FROM public.user_schools
        WHERE user_id = auth.uid() AND is_active = true
      )
    )
  );

-- task_completion_log (group_id -> groups.school_id)
CREATE POLICY "School members can read task_completion_log"
  ON public.task_completion_log FOR SELECT TO authenticated
  USING (
    group_id IN (
      SELECT id FROM public.groups g
      WHERE g.school_id IN (
        SELECT school_id FROM public.user_schools
        WHERE user_id = auth.uid() AND is_active = true
      )
    )
  );
CREATE POLICY "School members can insert task_completion_log"
  ON public.task_completion_log FOR INSERT TO authenticated
  WITH CHECK (
    group_id IN (
      SELECT id FROM public.groups g
      WHERE g.school_id IN (
        SELECT school_id FROM public.user_schools
        WHERE user_id = auth.uid() AND is_active = true
      )
    )
  );

-- ============================================================
-- User-owned / creator-scoped
-- ============================================================

-- study_techniques (created_by or global)
CREATE POLICY "Authenticated can read study_techniques"
  ON public.study_techniques FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert study_techniques"
  ON public.study_techniques FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Creators can update study_techniques"
  ON public.study_techniques FOR UPDATE TO authenticated
  USING (created_by = auth.uid()) WITH CHECK (created_by = auth.uid());
CREATE POLICY "Creators can delete study_techniques"
  ON public.study_techniques FOR DELETE TO authenticated
  USING (created_by = auth.uid());

-- task_library (created_by)
CREATE POLICY "Authenticated can read task_library"
  ON public.task_library FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert task_library"
  ON public.task_library FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Creators can update task_library"
  ON public.task_library FOR UPDATE TO authenticated
  USING (created_by = auth.uid()) WITH CHECK (created_by = auth.uid());

-- day_block_activities (user_id)
CREATE POLICY "Users can read own day_block_activities"
  ON public.day_block_activities FOR SELECT TO authenticated
  USING (user_id = auth.uid());
CREATE POLICY "Users can insert own day_block_activities"
  ON public.day_block_activities FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own day_block_activities"
  ON public.day_block_activities FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can delete own day_block_activities"
  ON public.day_block_activities FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- daily_progress (no user_id — global platform stats; admin only)
CREATE POLICY "Admins can read daily_progress"
  ON public.daily_progress FOR SELECT TO authenticated
  USING (public.is_current_user_admin());
CREATE POLICY "Authenticated can insert daily_progress"
  ON public.daily_progress FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated can update daily_progress"
  ON public.daily_progress FOR UPDATE TO authenticated
  USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

-- vocabulary_practice_log already done above
-- writing_practice_log already done above
