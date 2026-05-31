/*
  # Add RLS policies for woordenschat and shared platform tables (Part 1)

  Covers reference/global data tables, school-scoped tables, and user-owned tables.

  1. Global/reference tables: authenticated read, admins manage
  2. School-scoped tables: scoped via user_schools join or groups.school_id join
  3. User-owned tables: scoped by user_id / created_by = auth.uid()
*/

-- ============================================================
-- Global reference data: authenticated read, admin manage
-- ============================================================
CREATE POLICY "Authenticated can read age_groups"
  ON public.age_groups FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage age_groups"
  ON public.age_groups FOR INSERT TO authenticated WITH CHECK (public.is_current_user_admin());
CREATE POLICY "Admins can update age_groups"
  ON public.age_groups FOR UPDATE TO authenticated
  USING (public.is_current_user_admin()) WITH CHECK (public.is_current_user_admin());
CREATE POLICY "Admins can delete age_groups"
  ON public.age_groups FOR DELETE TO authenticated USING (public.is_current_user_admin());

CREATE POLICY "Authenticated can read assertive_sentences"
  ON public.assertive_sentences FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage assertive_sentences"
  ON public.assertive_sentences FOR INSERT TO authenticated WITH CHECK (public.is_current_user_admin());
CREATE POLICY "Admins can update assertive_sentences"
  ON public.assertive_sentences FOR UPDATE TO authenticated
  USING (public.is_current_user_admin()) WITH CHECK (public.is_current_user_admin());
CREATE POLICY "Admins can delete assertive_sentences"
  ON public.assertive_sentences FOR DELETE TO authenticated USING (public.is_current_user_admin());

CREATE POLICY "Authenticated can read educational_goals"
  ON public.educational_goals FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage educational_goals"
  ON public.educational_goals FOR INSERT TO authenticated WITH CHECK (public.is_current_user_admin());
CREATE POLICY "Admins can update educational_goals"
  ON public.educational_goals FOR UPDATE TO authenticated
  USING (public.is_current_user_admin()) WITH CHECK (public.is_current_user_admin());
CREATE POLICY "Admins can delete educational_goals"
  ON public.educational_goals FOR DELETE TO authenticated USING (public.is_current_user_admin());

CREATE POLICY "Authenticated can read exercise_sets"
  ON public.exercise_sets FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage exercise_sets"
  ON public.exercise_sets FOR INSERT TO authenticated WITH CHECK (public.is_current_user_admin());
CREATE POLICY "Admins can update exercise_sets"
  ON public.exercise_sets FOR UPDATE TO authenticated
  USING (public.is_current_user_admin()) WITH CHECK (public.is_current_user_admin());
CREATE POLICY "Admins can delete exercise_sets"
  ON public.exercise_sets FOR DELETE TO authenticated USING (public.is_current_user_admin());

CREATE POLICY "Authenticated can read exercises"
  ON public.exercises FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage exercises"
  ON public.exercises FOR INSERT TO authenticated WITH CHECK (public.is_current_user_admin());
CREATE POLICY "Admins can update exercises"
  ON public.exercises FOR UPDATE TO authenticated
  USING (public.is_current_user_admin()) WITH CHECK (public.is_current_user_admin());
CREATE POLICY "Admins can delete exercises"
  ON public.exercises FOR DELETE TO authenticated USING (public.is_current_user_admin());

CREATE POLICY "Authenticated can read game_questions"
  ON public.game_questions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage game_questions"
  ON public.game_questions FOR INSERT TO authenticated WITH CHECK (public.is_current_user_admin());
CREATE POLICY "Admins can update game_questions"
  ON public.game_questions FOR UPDATE TO authenticated
  USING (public.is_current_user_admin()) WITH CHECK (public.is_current_user_admin());
CREATE POLICY "Admins can delete game_questions"
  ON public.game_questions FOR DELETE TO authenticated USING (public.is_current_user_admin());

CREATE POLICY "Authenticated can read homework_hints"
  ON public.homework_hints FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage homework_hints"
  ON public.homework_hints FOR INSERT TO authenticated WITH CHECK (public.is_current_user_admin());
CREATE POLICY "Admins can update homework_hints"
  ON public.homework_hints FOR UPDATE TO authenticated
  USING (public.is_current_user_admin()) WITH CHECK (public.is_current_user_admin());
CREATE POLICY "Admins can delete homework_hints"
  ON public.homework_hints FOR DELETE TO authenticated USING (public.is_current_user_admin());

CREATE POLICY "Authenticated can read homework_stage_hints"
  ON public.homework_stage_hints FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage homework_stage_hints"
  ON public.homework_stage_hints FOR INSERT TO authenticated WITH CHECK (public.is_current_user_admin());
CREATE POLICY "Admins can update homework_stage_hints"
  ON public.homework_stage_hints FOR UPDATE TO authenticated
  USING (public.is_current_user_admin()) WITH CHECK (public.is_current_user_admin());
CREATE POLICY "Admins can delete homework_stage_hints"
  ON public.homework_stage_hints FOR DELETE TO authenticated USING (public.is_current_user_admin());

CREATE POLICY "Authenticated can read learning_games"
  ON public.learning_games FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage learning_games"
  ON public.learning_games FOR INSERT TO authenticated WITH CHECK (public.is_current_user_admin());
CREATE POLICY "Admins can update learning_games"
  ON public.learning_games FOR UPDATE TO authenticated
  USING (public.is_current_user_admin()) WITH CHECK (public.is_current_user_admin());
CREATE POLICY "Admins can delete learning_games"
  ON public.learning_games FOR DELETE TO authenticated USING (public.is_current_user_admin());

CREATE POLICY "Authenticated can read learning_lines"
  ON public.learning_lines FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage learning_lines"
  ON public.learning_lines FOR INSERT TO authenticated WITH CHECK (public.is_current_user_admin());
CREATE POLICY "Admins can update learning_lines"
  ON public.learning_lines FOR UPDATE TO authenticated
  USING (public.is_current_user_admin()) WITH CHECK (public.is_current_user_admin());
CREATE POLICY "Admins can delete learning_lines"
  ON public.learning_lines FOR DELETE TO authenticated USING (public.is_current_user_admin());

CREATE POLICY "Authenticated can read learning_techniques"
  ON public.learning_techniques FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage learning_techniques"
  ON public.learning_techniques FOR INSERT TO authenticated WITH CHECK (public.is_current_user_admin());
CREATE POLICY "Admins can update learning_techniques"
  ON public.learning_techniques FOR UPDATE TO authenticated
  USING (public.is_current_user_admin()) WITH CHECK (public.is_current_user_admin());
CREATE POLICY "Admins can delete learning_techniques"
  ON public.learning_techniques FOR DELETE TO authenticated USING (public.is_current_user_admin());

CREATE POLICY "Authenticated can read materials"
  ON public.materials FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage materials"
  ON public.materials FOR INSERT TO authenticated WITH CHECK (public.is_current_user_admin());
CREATE POLICY "Admins can update materials"
  ON public.materials FOR UPDATE TO authenticated
  USING (public.is_current_user_admin()) WITH CHECK (public.is_current_user_admin());
CREATE POLICY "Admins can delete materials"
  ON public.materials FOR DELETE TO authenticated USING (public.is_current_user_admin());

CREATE POLICY "Authenticated can read physical_tasks"
  ON public.physical_tasks FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage physical_tasks"
  ON public.physical_tasks FOR INSERT TO authenticated WITH CHECK (public.is_current_user_admin());
CREATE POLICY "Admins can update physical_tasks"
  ON public.physical_tasks FOR UPDATE TO authenticated
  USING (public.is_current_user_admin()) WITH CHECK (public.is_current_user_admin());
CREATE POLICY "Admins can delete physical_tasks"
  ON public.physical_tasks FOR DELETE TO authenticated USING (public.is_current_user_admin());

CREATE POLICY "Admins can read rejected_words"
  ON public.rejected_words FOR SELECT TO authenticated USING (public.is_current_user_admin());
CREATE POLICY "Admins can manage rejected_words"
  ON public.rejected_words FOR INSERT TO authenticated WITH CHECK (public.is_current_user_admin());
CREATE POLICY "Admins can update rejected_words"
  ON public.rejected_words FOR UPDATE TO authenticated
  USING (public.is_current_user_admin()) WITH CHECK (public.is_current_user_admin());

CREATE POLICY "Authenticated can read routine_goals"
  ON public.routine_goals FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert routine_goals"
  ON public.routine_goals FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated can delete routine_goals"
  ON public.routine_goals FOR DELETE TO authenticated USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated can read subjects"
  ON public.subjects FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage subjects"
  ON public.subjects FOR INSERT TO authenticated WITH CHECK (public.is_current_user_admin());
CREATE POLICY "Admins can update subjects"
  ON public.subjects FOR UPDATE TO authenticated
  USING (public.is_current_user_admin()) WITH CHECK (public.is_current_user_admin());
CREATE POLICY "Admins can delete subjects"
  ON public.subjects FOR DELETE TO authenticated USING (public.is_current_user_admin());

CREATE POLICY "Authenticated can read vocabulary_categories"
  ON public.vocabulary_categories FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage vocabulary_categories"
  ON public.vocabulary_categories FOR INSERT TO authenticated WITH CHECK (public.is_current_user_admin());
CREATE POLICY "Admins can update vocabulary_categories"
  ON public.vocabulary_categories FOR UPDATE TO authenticated
  USING (public.is_current_user_admin()) WITH CHECK (public.is_current_user_admin());
CREATE POLICY "Admins can delete vocabulary_categories"
  ON public.vocabulary_categories FOR DELETE TO authenticated USING (public.is_current_user_admin());

CREATE POLICY "Authenticated can read vocabulary_words"
  ON public.vocabulary_words FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage vocabulary_words"
  ON public.vocabulary_words FOR INSERT TO authenticated WITH CHECK (public.is_current_user_admin());
CREATE POLICY "Admins can update vocabulary_words"
  ON public.vocabulary_words FOR UPDATE TO authenticated
  USING (public.is_current_user_admin()) WITH CHECK (public.is_current_user_admin());
CREATE POLICY "Admins can delete vocabulary_words"
  ON public.vocabulary_words FOR DELETE TO authenticated USING (public.is_current_user_admin());

CREATE POLICY "Authenticated can read writing_exercises"
  ON public.writing_exercises FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage writing_exercises"
  ON public.writing_exercises FOR INSERT TO authenticated WITH CHECK (public.is_current_user_admin());
CREATE POLICY "Admins can update writing_exercises"
  ON public.writing_exercises FOR UPDATE TO authenticated
  USING (public.is_current_user_admin()) WITH CHECK (public.is_current_user_admin());
CREATE POLICY "Admins can delete writing_exercises"
  ON public.writing_exercises FOR DELETE TO authenticated USING (public.is_current_user_admin());

-- sticker catalog
CREATE POLICY "Authenticated can read sticker_formats"
  ON public.sticker_formats FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage sticker_formats"
  ON public.sticker_formats FOR INSERT TO authenticated WITH CHECK (public.is_current_user_admin());
CREATE POLICY "Admins can update sticker_formats"
  ON public.sticker_formats FOR UPDATE TO authenticated
  USING (public.is_current_user_admin()) WITH CHECK (public.is_current_user_admin());
CREATE POLICY "Admins can delete sticker_formats"
  ON public.sticker_formats FOR DELETE TO authenticated USING (public.is_current_user_admin());

CREATE POLICY "Authenticated can read sticker_data_plans"
  ON public.sticker_data_plans FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage sticker_data_plans"
  ON public.sticker_data_plans FOR INSERT TO authenticated WITH CHECK (public.is_current_user_admin());
CREATE POLICY "Admins can update sticker_data_plans"
  ON public.sticker_data_plans FOR UPDATE TO authenticated
  USING (public.is_current_user_admin()) WITH CHECK (public.is_current_user_admin());
CREATE POLICY "Admins can delete sticker_data_plans"
  ON public.sticker_data_plans FOR DELETE TO authenticated USING (public.is_current_user_admin());

CREATE POLICY "Authenticated can read sticker_pricing_tiers"
  ON public.sticker_pricing_tiers FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage sticker_pricing_tiers"
  ON public.sticker_pricing_tiers FOR INSERT TO authenticated WITH CHECK (public.is_current_user_admin());
CREATE POLICY "Admins can update sticker_pricing_tiers"
  ON public.sticker_pricing_tiers FOR UPDATE TO authenticated
  USING (public.is_current_user_admin()) WITH CHECK (public.is_current_user_admin());

CREATE POLICY "Authenticated can read invite_settings"
  ON public.invite_settings FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage invite_settings"
  ON public.invite_settings FOR INSERT TO authenticated WITH CHECK (public.is_current_user_admin());
CREATE POLICY "Admins can update invite_settings"
  ON public.invite_settings FOR UPDATE TO authenticated
  USING (public.is_current_user_admin()) WITH CHECK (public.is_current_user_admin());

-- ============================================================
-- School-scoped (use groups.school_id for group-based access)
-- ============================================================

-- Helper macro: group_id is from public.groups which has school_id
-- classes
CREATE POLICY "School members can read classes"
  ON public.classes FOR SELECT TO authenticated
  USING (school_id IN (
    SELECT school_id FROM public.user_schools
    WHERE user_id = auth.uid() AND is_active = true
  ));
CREATE POLICY "School members can insert classes"
  ON public.classes FOR INSERT TO authenticated
  WITH CHECK (school_id IN (
    SELECT school_id FROM public.user_schools
    WHERE user_id = auth.uid() AND is_active = true
  ));
CREATE POLICY "School members can update classes"
  ON public.classes FOR UPDATE TO authenticated
  USING (school_id IN (
    SELECT school_id FROM public.user_schools
    WHERE user_id = auth.uid() AND is_active = true
  ))
  WITH CHECK (school_id IN (
    SELECT school_id FROM public.user_schools
    WHERE user_id = auth.uid() AND is_active = true
  ));
CREATE POLICY "School admins can delete classes"
  ON public.classes FOR DELETE TO authenticated
  USING (public.is_school_admin(school_id));

-- routines
CREATE POLICY "Authenticated can read routines"
  ON public.routines FOR SELECT TO authenticated
  USING (
    is_default = true
    OR school_id IN (
      SELECT school_id FROM public.user_schools
      WHERE user_id = auth.uid() AND is_active = true
    )
  );
CREATE POLICY "School members can insert routines"
  ON public.routines FOR INSERT TO authenticated
  WITH CHECK (school_id IN (
    SELECT school_id FROM public.user_schools
    WHERE user_id = auth.uid() AND is_active = true
  ));
CREATE POLICY "School members can update routines"
  ON public.routines FOR UPDATE TO authenticated
  USING (school_id IN (
    SELECT school_id FROM public.user_schools
    WHERE user_id = auth.uid() AND is_active = true
  ))
  WITH CHECK (school_id IN (
    SELECT school_id FROM public.user_schools
    WHERE user_id = auth.uid() AND is_active = true
  ));
CREATE POLICY "School admins can delete routines"
  ON public.routines FOR DELETE TO authenticated
  USING (public.is_school_admin(school_id));

-- custom_vocabulary
CREATE POLICY "School members can read custom_vocabulary"
  ON public.custom_vocabulary FOR SELECT TO authenticated
  USING (school_id IN (
    SELECT school_id FROM public.user_schools
    WHERE user_id = auth.uid() AND is_active = true
  ));
CREATE POLICY "School members can insert custom_vocabulary"
  ON public.custom_vocabulary FOR INSERT TO authenticated
  WITH CHECK (school_id IN (
    SELECT school_id FROM public.user_schools
    WHERE user_id = auth.uid() AND is_active = true
  ));
CREATE POLICY "School members can update custom_vocabulary"
  ON public.custom_vocabulary FOR UPDATE TO authenticated
  USING (school_id IN (
    SELECT school_id FROM public.user_schools
    WHERE user_id = auth.uid() AND is_active = true
  ))
  WITH CHECK (school_id IN (
    SELECT school_id FROM public.user_schools
    WHERE user_id = auth.uid() AND is_active = true
  ));
CREATE POLICY "School members can delete custom_vocabulary"
  ON public.custom_vocabulary FOR DELETE TO authenticated
  USING (school_id IN (
    SELECT school_id FROM public.user_schools
    WHERE user_id = auth.uid() AND is_active = true
  ));

-- hoekenwerk_templates
CREATE POLICY "School members can read hoekenwerk_templates"
  ON public.hoekenwerk_templates FOR SELECT TO authenticated
  USING (school_id IN (
    SELECT school_id FROM public.user_schools
    WHERE user_id = auth.uid() AND is_active = true
  ));
CREATE POLICY "School members can insert hoekenwerk_templates"
  ON public.hoekenwerk_templates FOR INSERT TO authenticated
  WITH CHECK (school_id IN (
    SELECT school_id FROM public.user_schools
    WHERE user_id = auth.uid() AND is_active = true
  ));
CREATE POLICY "School members can update hoekenwerk_templates"
  ON public.hoekenwerk_templates FOR UPDATE TO authenticated
  USING (school_id IN (
    SELECT school_id FROM public.user_schools
    WHERE user_id = auth.uid() AND is_active = true
  ))
  WITH CHECK (school_id IN (
    SELECT school_id FROM public.user_schools
    WHERE user_id = auth.uid() AND is_active = true
  ));
CREATE POLICY "School admins can delete hoekenwerk_templates"
  ON public.hoekenwerk_templates FOR DELETE TO authenticated
  USING (public.is_school_admin(school_id));

-- hoekenwerk_template_items (via template_id -> hoekenwerk_templates.school_id)
CREATE POLICY "School members can read hoekenwerk_template_items"
  ON public.hoekenwerk_template_items FOR SELECT TO authenticated
  USING (
    template_id IN (
      SELECT id FROM public.hoekenwerk_templates ht
      WHERE ht.school_id IN (
        SELECT school_id FROM public.user_schools
        WHERE user_id = auth.uid() AND is_active = true
      )
    )
  );
CREATE POLICY "School members can manage hoekenwerk_template_items"
  ON public.hoekenwerk_template_items FOR INSERT TO authenticated
  WITH CHECK (
    template_id IN (
      SELECT id FROM public.hoekenwerk_templates ht
      WHERE ht.school_id IN (
        SELECT school_id FROM public.user_schools
        WHERE user_id = auth.uid() AND is_active = true
      )
    )
  );
CREATE POLICY "School members can update hoekenwerk_template_items"
  ON public.hoekenwerk_template_items FOR UPDATE TO authenticated
  USING (
    template_id IN (
      SELECT id FROM public.hoekenwerk_templates ht
      WHERE ht.school_id IN (
        SELECT school_id FROM public.user_schools
        WHERE user_id = auth.uid() AND is_active = true
      )
    )
  )
  WITH CHECK (
    template_id IN (
      SELECT id FROM public.hoekenwerk_templates ht
      WHERE ht.school_id IN (
        SELECT school_id FROM public.user_schools
        WHERE user_id = auth.uid() AND is_active = true
      )
    )
  );
CREATE POLICY "School members can delete hoekenwerk_template_items"
  ON public.hoekenwerk_template_items FOR DELETE TO authenticated
  USING (
    template_id IN (
      SELECT id FROM public.hoekenwerk_templates ht
      WHERE ht.school_id IN (
        SELECT school_id FROM public.user_schools
        WHERE user_id = auth.uid() AND is_active = true
      )
    )
  );

-- hoekenwerk_schedules (group_id -> groups.school_id)
CREATE POLICY "School members can read hoekenwerk_schedules"
  ON public.hoekenwerk_schedules FOR SELECT TO authenticated
  USING (
    group_id IN (
      SELECT id FROM public.groups g
      WHERE g.school_id IN (
        SELECT school_id FROM public.user_schools
        WHERE user_id = auth.uid() AND is_active = true
      )
    )
  );
CREATE POLICY "School members can insert hoekenwerk_schedules"
  ON public.hoekenwerk_schedules FOR INSERT TO authenticated
  WITH CHECK (
    group_id IN (
      SELECT id FROM public.groups g
      WHERE g.school_id IN (
        SELECT school_id FROM public.user_schools
        WHERE user_id = auth.uid() AND is_active = true
      )
    )
  );
CREATE POLICY "School members can update hoekenwerk_schedules"
  ON public.hoekenwerk_schedules FOR UPDATE TO authenticated
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
CREATE POLICY "School members can delete hoekenwerk_schedules"
  ON public.hoekenwerk_schedules FOR DELETE TO authenticated
  USING (
    group_id IN (
      SELECT id FROM public.groups g
      WHERE g.school_id IN (
        SELECT school_id FROM public.user_schools
        WHERE user_id = auth.uid() AND is_active = true
      )
    )
  );

-- educational_materials (global or school-scoped)
CREATE POLICY "Authenticated can read educational_materials"
  ON public.educational_materials FOR SELECT TO authenticated
  USING (
    is_global = true
    OR school_id IN (
      SELECT school_id FROM public.user_schools
      WHERE user_id = auth.uid() AND is_active = true
    )
  );
CREATE POLICY "Authenticated can insert educational_materials"
  ON public.educational_materials FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Creators can update educational_materials"
  ON public.educational_materials FOR UPDATE TO authenticated
  USING (created_by = auth.uid()) WITH CHECK (created_by = auth.uid());
CREATE POLICY "Creators can delete educational_materials"
  ON public.educational_materials FOR DELETE TO authenticated
  USING (created_by = auth.uid());

-- educational_videos
CREATE POLICY "Authenticated can read educational_videos"
  ON public.educational_videos FOR SELECT TO authenticated
  USING (
    is_global = true
    OR school_id IN (
      SELECT school_id FROM public.user_schools
      WHERE user_id = auth.uid() AND is_active = true
    )
  );
CREATE POLICY "Authenticated can insert educational_videos"
  ON public.educational_videos FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Creators can update educational_videos"
  ON public.educational_videos FOR UPDATE TO authenticated
  USING (created_by = auth.uid()) WITH CHECK (created_by = auth.uid());
CREATE POLICY "Creators can delete educational_videos"
  ON public.educational_videos FOR DELETE TO authenticated
  USING (created_by = auth.uid());

-- educational_material_goals / educational_video_goals
CREATE POLICY "Authenticated can read educational_material_goals"
  ON public.educational_material_goals FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can manage educational_material_goals"
  ON public.educational_material_goals FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated can delete educational_material_goals"
  ON public.educational_material_goals FOR DELETE TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated can read educational_video_goals"
  ON public.educational_video_goals FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can manage educational_video_goals"
  ON public.educational_video_goals FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated can delete educational_video_goals"
  ON public.educational_video_goals FOR DELETE TO authenticated
  USING (auth.uid() IS NOT NULL);

-- lessons (school_id)
CREATE POLICY "School members can read lessons"
  ON public.lessons FOR SELECT TO authenticated
  USING (school_id IN (
    SELECT school_id FROM public.user_schools
    WHERE user_id = auth.uid() AND is_active = true
  ));
CREATE POLICY "School members can insert lessons"
  ON public.lessons FOR INSERT TO authenticated
  WITH CHECK (school_id IN (
    SELECT school_id FROM public.user_schools
    WHERE user_id = auth.uid() AND is_active = true
  ));
CREATE POLICY "Creators can update lessons"
  ON public.lessons FOR UPDATE TO authenticated
  USING (created_by = auth.uid()) WITH CHECK (created_by = auth.uid());
CREATE POLICY "Creators can delete lessons"
  ON public.lessons FOR DELETE TO authenticated
  USING (created_by = auth.uid());

-- lesson_items (via lesson_id -> lessons.school_id)
CREATE POLICY "School members can read lesson_items"
  ON public.lesson_items FOR SELECT TO authenticated
  USING (
    lesson_id IN (
      SELECT id FROM public.lessons l
      WHERE l.school_id IN (
        SELECT school_id FROM public.user_schools
        WHERE user_id = auth.uid() AND is_active = true
      )
    )
  );
CREATE POLICY "School members can manage lesson_items"
  ON public.lesson_items FOR INSERT TO authenticated
  WITH CHECK (
    lesson_id IN (
      SELECT id FROM public.lessons l
      WHERE l.school_id IN (
        SELECT school_id FROM public.user_schools
        WHERE user_id = auth.uid() AND is_active = true
      )
    )
  );
CREATE POLICY "School members can update lesson_items"
  ON public.lesson_items FOR UPDATE TO authenticated
  USING (
    lesson_id IN (
      SELECT id FROM public.lessons l
      WHERE l.school_id IN (
        SELECT school_id FROM public.user_schools
        WHERE user_id = auth.uid() AND is_active = true
      )
    )
  )
  WITH CHECK (
    lesson_id IN (
      SELECT id FROM public.lessons l
      WHERE l.school_id IN (
        SELECT school_id FROM public.user_schools
        WHERE user_id = auth.uid() AND is_active = true
      )
    )
  );
CREATE POLICY "School members can delete lesson_items"
  ON public.lesson_items FOR DELETE TO authenticated
  USING (
    lesson_id IN (
      SELECT id FROM public.lessons l
      WHERE l.school_id IN (
        SELECT school_id FROM public.user_schools
        WHERE user_id = auth.uid() AND is_active = true
      )
    )
  );

-- lesson_goals (group_id -> groups.school_id)
CREATE POLICY "School members can read lesson_goals"
  ON public.lesson_goals FOR SELECT TO authenticated
  USING (
    group_id IN (
      SELECT id FROM public.groups g
      WHERE g.school_id IN (
        SELECT school_id FROM public.user_schools
        WHERE user_id = auth.uid() AND is_active = true
      )
    )
  );
CREATE POLICY "School members can manage lesson_goals"
  ON public.lesson_goals FOR INSERT TO authenticated
  WITH CHECK (
    group_id IN (
      SELECT id FROM public.groups g
      WHERE g.school_id IN (
        SELECT school_id FROM public.user_schools
        WHERE user_id = auth.uid() AND is_active = true
      )
    )
  );
CREATE POLICY "School members can delete lesson_goals"
  ON public.lesson_goals FOR DELETE TO authenticated
  USING (
    group_id IN (
      SELECT id FROM public.groups g
      WHERE g.school_id IN (
        SELECT school_id FROM public.user_schools
        WHERE user_id = auth.uid() AND is_active = true
      )
    )
  );

-- ============================================================
-- student_codes: school-scoped via student -> school
-- ============================================================
CREATE POLICY "School members can read student_codes"
  ON public.student_codes FOR SELECT TO authenticated
  USING (
    student_id IN (
      SELECT s.id FROM public.students s
      JOIN public.user_schools us ON us.school_id = s.school_id
      WHERE us.user_id = auth.uid() AND us.is_active = true
    )
  );
CREATE POLICY "School members can insert student_codes"
  ON public.student_codes FOR INSERT TO authenticated
  WITH CHECK (
    student_id IN (
      SELECT s.id FROM public.students s
      JOIN public.user_schools us ON us.school_id = s.school_id
      WHERE us.user_id = auth.uid() AND us.is_active = true
    )
  );
CREATE POLICY "School members can update student_codes"
  ON public.student_codes FOR UPDATE TO authenticated
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

-- ============================================================
-- invite_contacts / user_sticker_sheets / sticker_orders: user-owned
-- ============================================================
CREATE POLICY "Users can read own invite_contacts"
  ON public.invite_contacts FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users can insert own invite_contacts"
  ON public.invite_contacts FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own invite_contacts"
  ON public.invite_contacts FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can delete own invite_contacts"
  ON public.invite_contacts FOR DELETE TO authenticated USING (user_id = auth.uid());

CREATE POLICY "Users can read own sticker_sheets"
  ON public.user_sticker_sheets FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users can insert own sticker_sheets"
  ON public.user_sticker_sheets FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own sticker_sheets"
  ON public.user_sticker_sheets FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can delete own sticker_sheets"
  ON public.user_sticker_sheets FOR DELETE TO authenticated USING (user_id = auth.uid());

CREATE POLICY "Users can read own sticker_orders"
  ON public.sticker_orders FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_current_user_admin());
CREATE POLICY "Users can insert own sticker_orders"
  ON public.sticker_orders FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Admins can update sticker_orders"
  ON public.sticker_orders FOR UPDATE TO authenticated
  USING (public.is_current_user_admin()) WITH CHECK (public.is_current_user_admin());

CREATE POLICY "Users can read own sticker_order_items"
  ON public.sticker_order_items FOR SELECT TO authenticated
  USING (
    order_id IN (
      SELECT id FROM public.sticker_orders WHERE user_id = auth.uid()
    )
  );
CREATE POLICY "Users can manage sticker_order_items"
  ON public.sticker_order_items FOR INSERT TO authenticated
  WITH CHECK (
    order_id IN (
      SELECT id FROM public.sticker_orders WHERE user_id = auth.uid()
    )
  );
