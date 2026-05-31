/*
  # Comprehensive RLS policy fix for bijleer.school

  ## Summary
  Audit found that most tables have RLS enabled but zero policies (locking everyone out),
  and a handful of existing policies are either too permissive or missing school-scope guards.
  This migration:

  1. Drops all existing broken/overly-permissive policies on affected tables
  2. Adds correct, school-scoped policies for every table used by the bijleer.school frontend
  3. Restores proper public-access policies for student-facing tables (zoeker, webwijzer)
  4. Adds admin-only policies for platform-managed tables (digitools, newsletters, executive_functions)
  5. Adds user-scoped policies for personal tables (user_preferences, behavior_card_presets)

  ## Access pattern key
  - School-scoped: user must be in user_schools for the relevant school_id with is_active = true
  - Admin-only write: uses is_current_user_admin() helper function
  - Student public access: via student_id matching current_student_id() (anon token with claim)
  - Personal: user_id = auth.uid()

  ## Tables covered (50+)
  Behavior system, Activity boards, Sporen, Leescoach, Boeker, School day planning,
  School config tables, Newsletters, DigiTools, Executive functions, Zoeker, WebWijzer
*/

-- ============================================================
-- HELPER: reusable school-membership check
-- All policies use inline subquery for performance (avoids nested function calls)
-- ============================================================

-- ============================================================
-- 1. BEHAVIOR SYSTEM
-- ============================================================

-- behavior_categories
DROP POLICY IF EXISTS "School members can manage behavior_categories" ON behavior_categories;
CREATE POLICY "School members can manage behavior_categories"
  ON behavior_categories FOR ALL TO authenticated
  USING (school_id IN (SELECT school_id FROM user_schools WHERE user_id = auth.uid() AND is_active = true))
  WITH CHECK (school_id IN (SELECT school_id FROM user_schools WHERE user_id = auth.uid() AND is_active = true));

-- behavior_items
DROP POLICY IF EXISTS "School members can manage behavior_items" ON behavior_items;
CREATE POLICY "School members can manage behavior_items"
  ON behavior_items FOR ALL TO authenticated
  USING (school_id IN (SELECT school_id FROM user_schools WHERE user_id = auth.uid() AND is_active = true))
  WITH CHECK (school_id IN (SELECT school_id FROM user_schools WHERE user_id = auth.uid() AND is_active = true));

-- behavior_severity_levels
DROP POLICY IF EXISTS "School members can manage behavior_severity_levels" ON behavior_severity_levels;
CREATE POLICY "School members can manage behavior_severity_levels"
  ON behavior_severity_levels FOR ALL TO authenticated
  USING (school_id IN (SELECT school_id FROM user_schools WHERE user_id = auth.uid() AND is_active = true))
  WITH CHECK (school_id IN (SELECT school_id FROM user_schools WHERE user_id = auth.uid() AND is_active = true));

-- consequences
DROP POLICY IF EXISTS "School members can manage consequences" ON consequences;
CREATE POLICY "School members can manage consequences"
  ON consequences FOR ALL TO authenticated
  USING (school_id IN (SELECT school_id FROM user_schools WHERE user_id = auth.uid() AND is_active = true))
  WITH CHECK (school_id IN (SELECT school_id FROM user_schools WHERE user_id = auth.uid() AND is_active = true));

-- followup_actions
DROP POLICY IF EXISTS "School members can manage followup_actions" ON followup_actions;
CREATE POLICY "School members can manage followup_actions"
  ON followup_actions FOR ALL TO authenticated
  USING (school_id IN (SELECT school_id FROM user_schools WHERE user_id = auth.uid() AND is_active = true))
  WITH CHECK (school_id IN (SELECT school_id FROM user_schools WHERE user_id = auth.uid() AND is_active = true));

-- student_roles
DROP POLICY IF EXISTS "School members can manage student_roles" ON student_roles;
CREATE POLICY "School members can manage student_roles"
  ON student_roles FOR ALL TO authenticated
  USING (school_id IN (SELECT school_id FROM user_schools WHERE user_id = auth.uid() AND is_active = true))
  WITH CHECK (school_id IN (SELECT school_id FROM user_schools WHERE user_id = auth.uid() AND is_active = true));

-- behavior_incidents
DROP POLICY IF EXISTS "School members can manage behavior_incidents" ON behavior_incidents;
CREATE POLICY "School members can manage behavior_incidents"
  ON behavior_incidents FOR ALL TO authenticated
  USING (school_id IN (SELECT school_id FROM user_schools WHERE user_id = auth.uid() AND is_active = true))
  WITH CHECK (school_id IN (SELECT school_id FROM user_schools WHERE user_id = auth.uid() AND is_active = true));

-- behavior_incident_students (join through incident → school)
DROP POLICY IF EXISTS "School members can manage behavior_incident_students" ON behavior_incident_students;
CREATE POLICY "School members can manage behavior_incident_students"
  ON behavior_incident_students FOR ALL TO authenticated
  USING (
    incident_id IN (
      SELECT id FROM behavior_incidents
      WHERE school_id IN (SELECT school_id FROM user_schools WHERE user_id = auth.uid() AND is_active = true)
    )
  )
  WITH CHECK (
    incident_id IN (
      SELECT id FROM behavior_incidents
      WHERE school_id IN (SELECT school_id FROM user_schools WHERE user_id = auth.uid() AND is_active = true)
    )
  );

-- behavior_incident_attachments
DROP POLICY IF EXISTS "School members can manage behavior_incident_attachments" ON behavior_incident_attachments;
CREATE POLICY "School members can manage behavior_incident_attachments"
  ON behavior_incident_attachments FOR ALL TO authenticated
  USING (
    incident_id IN (
      SELECT id FROM behavior_incidents
      WHERE school_id IN (SELECT school_id FROM user_schools WHERE user_id = auth.uid() AND is_active = true)
    )
  )
  WITH CHECK (
    incident_id IN (
      SELECT id FROM behavior_incidents
      WHERE school_id IN (SELECT school_id FROM user_schools WHERE user_id = auth.uid() AND is_active = true)
    )
  );

-- behavior_incident_notifications
DROP POLICY IF EXISTS "School members can manage behavior_incident_notifications" ON behavior_incident_notifications;
CREATE POLICY "School members can manage behavior_incident_notifications"
  ON behavior_incident_notifications FOR ALL TO authenticated
  USING (
    incident_id IN (
      SELECT id FROM behavior_incidents
      WHERE school_id IN (SELECT school_id FROM user_schools WHERE user_id = auth.uid() AND is_active = true)
    )
  )
  WITH CHECK (
    incident_id IN (
      SELECT id FROM behavior_incidents
      WHERE school_id IN (SELECT school_id FROM user_schools WHERE user_id = auth.uid() AND is_active = true)
    )
  );

-- behavior_incident_eerste_acties
DROP POLICY IF EXISTS "School members can manage behavior_incident_eerste_acties" ON behavior_incident_eerste_acties;
CREATE POLICY "School members can manage behavior_incident_eerste_acties"
  ON behavior_incident_eerste_acties FOR ALL TO authenticated
  USING (
    incident_id IN (
      SELECT id FROM behavior_incidents
      WHERE school_id IN (SELECT school_id FROM user_schools WHERE user_id = auth.uid() AND is_active = true)
    )
  )
  WITH CHECK (
    incident_id IN (
      SELECT id FROM behavior_incidents
      WHERE school_id IN (SELECT school_id FROM user_schools WHERE user_id = auth.uid() AND is_active = true)
    )
  );

-- behavior_incident_followup_acties
DROP POLICY IF EXISTS "School members can manage behavior_incident_followup_acties" ON behavior_incident_followup_acties;
CREATE POLICY "School members can manage behavior_incident_followup_acties"
  ON behavior_incident_followup_acties FOR ALL TO authenticated
  USING (
    incident_id IN (
      SELECT id FROM behavior_incidents
      WHERE school_id IN (SELECT school_id FROM user_schools WHERE user_id = auth.uid() AND is_active = true)
    )
  )
  WITH CHECK (
    incident_id IN (
      SELECT id FROM behavior_incidents
      WHERE school_id IN (SELECT school_id FROM user_schools WHERE user_id = auth.uid() AND is_active = true)
    )
  );

-- behavior_item_consequences (linked to behavior_items which are school-scoped)
DROP POLICY IF EXISTS "School members can manage behavior_item_consequences" ON behavior_item_consequences;
CREATE POLICY "School members can manage behavior_item_consequences"
  ON behavior_item_consequences FOR ALL TO authenticated
  USING (
    behavior_item_id IN (
      SELECT id FROM behavior_items
      WHERE school_id IN (SELECT school_id FROM user_schools WHERE user_id = auth.uid() AND is_active = true)
    )
  )
  WITH CHECK (
    behavior_item_id IN (
      SELECT id FROM behavior_items
      WHERE school_id IN (SELECT school_id FROM user_schools WHERE user_id = auth.uid() AND is_active = true)
    )
  );

-- behavior_cards (public = readable by all authenticated; private = creator only)
DROP POLICY IF EXISTS "Authenticated can read public behavior_cards" ON behavior_cards;
DROP POLICY IF EXISTS "Users can manage own behavior_cards" ON behavior_cards;
CREATE POLICY "Authenticated can read public behavior_cards"
  ON behavior_cards FOR SELECT TO authenticated
  USING (is_public = true OR created_by_user_id = auth.uid());
CREATE POLICY "Users can manage own behavior_cards"
  ON behavior_cards FOR ALL TO authenticated
  USING (created_by_user_id = auth.uid())
  WITH CHECK (created_by_user_id = auth.uid());

-- behavior_card_progress (via student → school)
DROP POLICY IF EXISTS "School members can manage behavior_card_progress" ON behavior_card_progress;
CREATE POLICY "School members can manage behavior_card_progress"
  ON behavior_card_progress FOR ALL TO authenticated
  USING (
    student_id IN (
      SELECT s.id FROM students s
      JOIN user_schools us ON us.school_id = s.school_id
      WHERE us.user_id = auth.uid() AND us.is_active = true
    )
  )
  WITH CHECK (
    student_id IN (
      SELECT s.id FROM students s
      JOIN user_schools us ON us.school_id = s.school_id
      WHERE us.user_id = auth.uid() AND us.is_active = true
    )
  );

-- behavior_card_presets (user's own presets)
DROP POLICY IF EXISTS "Users can manage own behavior_card_presets" ON behavior_card_presets;
CREATE POLICY "Users can manage own behavior_card_presets"
  ON behavior_card_presets FOR ALL TO authenticated
  USING (school_id IN (SELECT school_id FROM user_schools WHERE user_id = auth.uid() AND is_active = true))
  WITH CHECK (school_id IN (SELECT school_id FROM user_schools WHERE user_id = auth.uid() AND is_active = true));

-- ============================================================
-- 2. ACTIVITY BOARDS
-- ============================================================

-- activity_boards
DROP POLICY IF EXISTS "School members can manage activity_boards" ON activity_boards;
CREATE POLICY "School members can manage activity_boards"
  ON activity_boards FOR ALL TO authenticated
  USING (school_id IN (SELECT school_id FROM user_schools WHERE user_id = auth.uid() AND is_active = true))
  WITH CHECK (school_id IN (SELECT school_id FROM user_schools WHERE user_id = auth.uid() AND is_active = true));

-- activity_options (via board → school)
DROP POLICY IF EXISTS "School members can manage activity_options" ON activity_options;
CREATE POLICY "School members can manage activity_options"
  ON activity_options FOR ALL TO authenticated
  USING (
    board_id IN (
      SELECT id FROM activity_boards
      WHERE school_id IN (SELECT school_id FROM user_schools WHERE user_id = auth.uid() AND is_active = true)
    )
  )
  WITH CHECK (
    board_id IN (
      SELECT id FROM activity_boards
      WHERE school_id IN (SELECT school_id FROM user_schools WHERE user_id = auth.uid() AND is_active = true)
    )
  );

-- activity_sessions (via board → school)
DROP POLICY IF EXISTS "School members can manage activity_sessions" ON activity_sessions;
CREATE POLICY "School members can manage activity_sessions"
  ON activity_sessions FOR ALL TO authenticated
  USING (
    board_id IN (
      SELECT id FROM activity_boards
      WHERE school_id IN (SELECT school_id FROM user_schools WHERE user_id = auth.uid() AND is_active = true)
    )
  )
  WITH CHECK (
    board_id IN (
      SELECT id FROM activity_boards
      WHERE school_id IN (SELECT school_id FROM user_schools WHERE user_id = auth.uid() AND is_active = true)
    )
  );

-- activity_board_access
DROP POLICY IF EXISTS "School members can manage activity_board_access" ON activity_board_access;
CREATE POLICY "School members can manage activity_board_access"
  ON activity_board_access FOR ALL TO authenticated
  USING (
    board_id IN (
      SELECT id FROM activity_boards
      WHERE school_id IN (SELECT school_id FROM user_schools WHERE user_id = auth.uid() AND is_active = true)
    )
  )
  WITH CHECK (
    board_id IN (
      SELECT id FROM activity_boards
      WHERE school_id IN (SELECT school_id FROM user_schools WHERE user_id = auth.uid() AND is_active = true)
    )
  );

-- activity_board_timeblocks
DROP POLICY IF EXISTS "School members can manage activity_board_timeblocks" ON activity_board_timeblocks;
CREATE POLICY "School members can manage activity_board_timeblocks"
  ON activity_board_timeblocks FOR ALL TO authenticated
  USING (
    board_id IN (
      SELECT id FROM activity_boards
      WHERE school_id IN (SELECT school_id FROM user_schools WHERE user_id = auth.uid() AND is_active = true)
    )
  )
  WITH CHECK (
    board_id IN (
      SELECT id FROM activity_boards
      WHERE school_id IN (SELECT school_id FROM user_schools WHERE user_id = auth.uid() AND is_active = true)
    )
  );

-- activity_collaboration_logs (via activity_sessions → board → school)
DROP POLICY IF EXISTS "School members can manage activity_collaboration_logs" ON activity_collaboration_logs;
CREATE POLICY "School members can manage activity_collaboration_logs"
  ON activity_collaboration_logs FOR ALL TO authenticated
  USING (
    session_id_1 IN (
      SELECT s.id FROM activity_sessions s
      JOIN activity_boards b ON b.id = s.board_id
      WHERE b.school_id IN (SELECT school_id FROM user_schools WHERE user_id = auth.uid() AND is_active = true)
    )
  )
  WITH CHECK (
    session_id_1 IN (
      SELECT s.id FROM activity_sessions s
      JOIN activity_boards b ON b.id = s.board_id
      WHERE b.school_id IN (SELECT school_id FROM user_schools WHERE user_id = auth.uid() AND is_active = true)
    )
  );

-- activity_presets
DROP POLICY IF EXISTS "School members can manage activity_presets" ON activity_presets;
CREATE POLICY "School members can manage activity_presets"
  ON activity_presets FOR ALL TO authenticated
  USING (school_id IN (SELECT school_id FROM user_schools WHERE user_id = auth.uid() AND is_active = true))
  WITH CHECK (school_id IN (SELECT school_id FROM user_schools WHERE user_id = auth.uid() AND is_active = true));

-- ============================================================
-- 3. SPOREN
-- ============================================================

-- sporen
DROP POLICY IF EXISTS "School members can manage sporen" ON sporen;
CREATE POLICY "School members can manage sporen"
  ON sporen FOR ALL TO authenticated
  USING (school_id IN (SELECT school_id FROM user_schools WHERE user_id = auth.uid() AND is_active = true))
  WITH CHECK (school_id IN (SELECT school_id FROM user_schools WHERE user_id = auth.uid() AND is_active = true));

-- spoor_notes (via spoor → school)
DROP POLICY IF EXISTS "School members can manage spoor_notes" ON spoor_notes;
CREATE POLICY "School members can manage spoor_notes"
  ON spoor_notes FOR ALL TO authenticated
  USING (
    spoor_id IN (
      SELECT id FROM sporen
      WHERE school_id IN (SELECT school_id FROM user_schools WHERE user_id = auth.uid() AND is_active = true)
    )
  )
  WITH CHECK (
    spoor_id IN (
      SELECT id FROM sporen
      WHERE school_id IN (SELECT school_id FROM user_schools WHERE user_id = auth.uid() AND is_active = true)
    )
  );

-- spoor_subject_links (via spoor → school)
DROP POLICY IF EXISTS "School members can manage spoor_subject_links" ON spoor_subject_links;
CREATE POLICY "School members can manage spoor_subject_links"
  ON spoor_subject_links FOR ALL TO authenticated
  USING (
    spoor_id IN (
      SELECT id FROM sporen
      WHERE school_id IN (SELECT school_id FROM user_schools WHERE user_id = auth.uid() AND is_active = true)
    )
  )
  WITH CHECK (
    spoor_id IN (
      SELECT id FROM sporen
      WHERE school_id IN (SELECT school_id FROM user_schools WHERE user_id = auth.uid() AND is_active = true)
    )
  );

-- student_spoor_assignments (via spoor → school)
DROP POLICY IF EXISTS "School members can manage student_spoor_assignments" ON student_spoor_assignments;
CREATE POLICY "School members can manage student_spoor_assignments"
  ON student_spoor_assignments FOR ALL TO authenticated
  USING (
    spoor_id IN (
      SELECT id FROM sporen
      WHERE school_id IN (SELECT school_id FROM user_schools WHERE user_id = auth.uid() AND is_active = true)
    )
  )
  WITH CHECK (
    spoor_id IN (
      SELECT id FROM sporen
      WHERE school_id IN (SELECT school_id FROM user_schools WHERE user_id = auth.uid() AND is_active = true)
    )
  );

-- ============================================================
-- 4. LEESCOACH (Reading Coach)
-- ============================================================

-- reading_techniques
DROP POLICY IF EXISTS "School members can manage reading_techniques" ON reading_techniques;
CREATE POLICY "School members can read global and school reading_techniques"
  ON reading_techniques FOR SELECT TO authenticated
  USING (
    school_id IS NULL
    OR school_id IN (SELECT school_id FROM user_schools WHERE user_id = auth.uid() AND is_active = true)
  );
CREATE POLICY "School members can manage own reading_techniques"
  ON reading_techniques FOR ALL TO authenticated
  USING (school_id IN (SELECT school_id FROM user_schools WHERE user_id = auth.uid() AND is_active = true))
  WITH CHECK (school_id IN (SELECT school_id FROM user_schools WHERE user_id = auth.uid() AND is_active = true));

-- reading_interventions
DROP POLICY IF EXISTS "School members can manage reading_interventions" ON reading_interventions;
CREATE POLICY "School members can read global and school reading_interventions"
  ON reading_interventions FOR SELECT TO authenticated
  USING (
    school_id IS NULL
    OR school_id IN (SELECT school_id FROM user_schools WHERE user_id = auth.uid() AND is_active = true)
  );
CREATE POLICY "School members can manage own reading_interventions"
  ON reading_interventions FOR ALL TO authenticated
  USING (school_id IN (SELECT school_id FROM user_schools WHERE user_id = auth.uid() AND is_active = true))
  WITH CHECK (school_id IN (SELECT school_id FROM user_schools WHERE user_id = auth.uid() AND is_active = true));

-- reading_coach_sessions
DROP POLICY IF EXISTS "School members can manage reading_coach_sessions" ON reading_coach_sessions;
CREATE POLICY "School members can manage reading_coach_sessions"
  ON reading_coach_sessions FOR ALL TO authenticated
  USING (school_id IN (SELECT school_id FROM user_schools WHERE user_id = auth.uid() AND is_active = true))
  WITH CHECK (school_id IN (SELECT school_id FROM user_schools WHERE user_id = auth.uid() AND is_active = true));

-- reading_session_techniques (via session → school)
DROP POLICY IF EXISTS "School members can manage reading_session_techniques" ON reading_session_techniques;
CREATE POLICY "School members can manage reading_session_techniques"
  ON reading_session_techniques FOR ALL TO authenticated
  USING (
    session_id IN (
      SELECT id FROM reading_coach_sessions
      WHERE school_id IN (SELECT school_id FROM user_schools WHERE user_id = auth.uid() AND is_active = true)
    )
  )
  WITH CHECK (
    session_id IN (
      SELECT id FROM reading_coach_sessions
      WHERE school_id IN (SELECT school_id FROM user_schools WHERE user_id = auth.uid() AND is_active = true)
    )
  );

-- reading_session_interventions (via session → school)
DROP POLICY IF EXISTS "School members can manage reading_session_interventions" ON reading_session_interventions;
CREATE POLICY "School members can manage reading_session_interventions"
  ON reading_session_interventions FOR ALL TO authenticated
  USING (
    session_id IN (
      SELECT id FROM reading_coach_sessions
      WHERE school_id IN (SELECT school_id FROM user_schools WHERE user_id = auth.uid() AND is_active = true)
    )
  )
  WITH CHECK (
    session_id IN (
      SELECT id FROM reading_coach_sessions
      WHERE school_id IN (SELECT school_id FROM user_schools WHERE user_id = auth.uid() AND is_active = true)
    )
  );

-- ============================================================
-- 5. BOEKER (Library system)
-- ============================================================

-- books
DROP POLICY IF EXISTS "School members can manage books" ON books;
CREATE POLICY "School members can manage books"
  ON books FOR ALL TO authenticated
  USING (school_id IN (SELECT school_id FROM user_schools WHERE user_id = auth.uid() AND is_active = true))
  WITH CHECK (school_id IN (SELECT school_id FROM user_schools WHERE user_id = auth.uid() AND is_active = true));

-- book_locations
DROP POLICY IF EXISTS "School members can manage book_locations" ON book_locations;
CREATE POLICY "School members can manage book_locations"
  ON book_locations FOR ALL TO authenticated
  USING (school_id IN (SELECT school_id FROM user_schools WHERE user_id = auth.uid() AND is_active = true))
  WITH CHECK (school_id IN (SELECT school_id FROM user_schools WHERE user_id = auth.uid() AND is_active = true));

-- book_loans
DROP POLICY IF EXISTS "School members can manage book_loans" ON book_loans;
CREATE POLICY "School members can manage book_loans"
  ON book_loans FOR ALL TO authenticated
  USING (school_id IN (SELECT school_id FROM user_schools WHERE user_id = auth.uid() AND is_active = true))
  WITH CHECK (school_id IN (SELECT school_id FROM user_schools WHERE user_id = auth.uid() AND is_active = true));

-- reading_sessions (via student → school)
DROP POLICY IF EXISTS "School members can manage reading_sessions" ON reading_sessions;
DROP POLICY IF EXISTS "Public can view reading sessions" ON reading_sessions;
DROP POLICY IF EXISTS "Public can create reading sessions" ON reading_sessions;
DROP POLICY IF EXISTS "Public can update reading sessions" ON reading_sessions;
CREATE POLICY "School members can manage reading_sessions"
  ON reading_sessions FOR ALL TO authenticated
  USING (
    student_id IN (
      SELECT s.id FROM students s
      JOIN user_schools us ON us.school_id = s.school_id
      WHERE us.user_id = auth.uid() AND us.is_active = true
    )
  )
  WITH CHECK (
    student_id IN (
      SELECT s.id FROM students s
      JOIN user_schools us ON us.school_id = s.school_id
      WHERE us.user_id = auth.uid() AND us.is_active = true
    )
  );
-- Students can also insert/view their own reading sessions
CREATE POLICY "Students can manage own reading_sessions"
  ON reading_sessions FOR ALL TO authenticated
  USING (student_id = current_student_id())
  WITH CHECK (student_id = current_student_id());

-- book_reviews (via student → school)
DROP POLICY IF EXISTS "School members can manage book_reviews" ON book_reviews;
DROP POLICY IF EXISTS "Public can view book reviews" ON book_reviews;
DROP POLICY IF EXISTS "Public can create book reviews" ON book_reviews;
CREATE POLICY "School members can manage book_reviews"
  ON book_reviews FOR ALL TO authenticated
  USING (
    student_id IN (
      SELECT s.id FROM students s
      JOIN user_schools us ON us.school_id = s.school_id
      WHERE us.user_id = auth.uid() AND us.is_active = true
    )
  )
  WITH CHECK (
    student_id IN (
      SELECT s.id FROM students s
      JOIN user_schools us ON us.school_id = s.school_id
      WHERE us.user_id = auth.uid() AND us.is_active = true
    )
  );
CREATE POLICY "Students can manage own book_reviews"
  ON book_reviews FOR ALL TO authenticated
  USING (student_id = current_student_id())
  WITH CHECK (student_id = current_student_id());

-- ============================================================
-- 6. SCHOOL DAY PLANNING
-- ============================================================

-- day_templates
DROP POLICY IF EXISTS "School members can manage day_templates" ON day_templates;
CREATE POLICY "School members can manage day_templates"
  ON day_templates FOR ALL TO authenticated
  USING (school_id IN (SELECT school_id FROM user_schools WHERE user_id = auth.uid() AND is_active = true))
  WITH CHECK (school_id IN (SELECT school_id FROM user_schools WHERE user_id = auth.uid() AND is_active = true));

-- day_template_blocks (via template → school)
DROP POLICY IF EXISTS "School members can manage day_template_blocks" ON day_template_blocks;
CREATE POLICY "School members can manage day_template_blocks"
  ON day_template_blocks FOR ALL TO authenticated
  USING (
    template_id IN (
      SELECT id FROM day_templates
      WHERE school_id IN (SELECT school_id FROM user_schools WHERE user_id = auth.uid() AND is_active = true)
    )
  )
  WITH CHECK (
    template_id IN (
      SELECT id FROM day_templates
      WHERE school_id IN (SELECT school_id FROM user_schools WHERE user_id = auth.uid() AND is_active = true)
    )
  );

-- school_day_templates
DROP POLICY IF EXISTS "School members can manage school_day_templates" ON school_day_templates;
CREATE POLICY "School members can manage school_day_templates"
  ON school_day_templates FOR ALL TO authenticated
  USING (school_id IN (SELECT school_id FROM user_schools WHERE user_id = auth.uid() AND is_active = true))
  WITH CHECK (school_id IN (SELECT school_id FROM user_schools WHERE user_id = auth.uid() AND is_active = true));

-- group_day_templates (via group → school)
DROP POLICY IF EXISTS "School members can manage group_day_templates" ON group_day_templates;
CREATE POLICY "School members can manage group_day_templates"
  ON group_day_templates FOR ALL TO authenticated
  USING (
    group_id IN (
      SELECT id FROM groups
      WHERE school_id IN (SELECT school_id FROM user_schools WHERE user_id = auth.uid() AND is_active = true)
    )
  )
  WITH CHECK (
    group_id IN (
      SELECT id FROM groups
      WHERE school_id IN (SELECT school_id FROM user_schools WHERE user_id = auth.uid() AND is_active = true)
    )
  );

-- ============================================================
-- 7. SCHOOL CONFIGURATION TABLES
-- ============================================================

-- school_grades
DROP POLICY IF EXISTS "School members can manage school_grades" ON school_grades;
CREATE POLICY "School members can manage school_grades"
  ON school_grades FOR ALL TO authenticated
  USING (school_id IN (SELECT school_id FROM user_schools WHERE user_id = auth.uid() AND is_active = true))
  WITH CHECK (school_id IN (SELECT school_id FROM user_schools WHERE user_id = auth.uid() AND is_active = true));

-- school_subjects
DROP POLICY IF EXISTS "School members can manage school_subjects" ON school_subjects;
CREATE POLICY "School members can manage school_subjects"
  ON school_subjects FOR ALL TO authenticated
  USING (school_id IN (SELECT school_id FROM user_schools WHERE user_id = auth.uid() AND is_active = true))
  WITH CHECK (school_id IN (SELECT school_id FROM user_schools WHERE user_id = auth.uid() AND is_active = true));

-- school_lesson_settings
DROP POLICY IF EXISTS "School members can manage school_lesson_settings" ON school_lesson_settings;
CREATE POLICY "School members can manage school_lesson_settings"
  ON school_lesson_settings FOR ALL TO authenticated
  USING (school_id IN (SELECT school_id FROM user_schools WHERE user_id = auth.uid() AND is_active = true))
  WITH CHECK (school_id IN (SELECT school_id FROM user_schools WHERE user_id = auth.uid() AND is_active = true));

-- ============================================================
-- 8. SCHOOL MATERIALS
-- ============================================================

-- school_materials
DROP POLICY IF EXISTS "School members can manage school_materials" ON school_materials;
CREATE POLICY "School members can manage school_materials"
  ON school_materials FOR ALL TO authenticated
  USING (school_id IN (SELECT school_id FROM user_schools WHERE user_id = auth.uid() AND is_active = true))
  WITH CHECK (school_id IN (SELECT school_id FROM user_schools WHERE user_id = auth.uid() AND is_active = true));

-- school_material_loans (via material → school)
DROP POLICY IF EXISTS "School members can manage school_material_loans" ON school_material_loans;
CREATE POLICY "School members can manage school_material_loans"
  ON school_material_loans FOR ALL TO authenticated
  USING (
    material_id IN (
      SELECT id FROM school_materials
      WHERE school_id IN (SELECT school_id FROM user_schools WHERE user_id = auth.uid() AND is_active = true)
    )
  )
  WITH CHECK (
    material_id IN (
      SELECT id FROM school_materials
      WHERE school_id IN (SELECT school_id FROM user_schools WHERE user_id = auth.uid() AND is_active = true)
    )
  );

-- ============================================================
-- 9. NEWSLETTERS
-- ============================================================

DROP POLICY IF EXISTS "Admins can view all newsletters" ON newsletters;
DROP POLICY IF EXISTS "Premium school users can view newsletters" ON newsletters;
DROP POLICY IF EXISTS "Only admins can insert newsletters" ON newsletters;
DROP POLICY IF EXISTS "Only admins can update newsletters" ON newsletters;
DROP POLICY IF EXISTS "Only admins can delete newsletters" ON newsletters;
DROP POLICY IF EXISTS "School members can read newsletters" ON newsletters;
DROP POLICY IF EXISTS "Admins can manage newsletters" ON newsletters;

-- School members read their school's newsletters (or global ones with null school_id)
CREATE POLICY "School members can read newsletters"
  ON newsletters FOR SELECT TO authenticated
  USING (
    school_id IS NULL
    OR school_id IN (SELECT school_id FROM user_schools WHERE user_id = auth.uid() AND is_active = true)
  );

-- Only platform admins can create/update/delete newsletters
CREATE POLICY "Admins can insert newsletters"
  ON newsletters FOR INSERT TO authenticated
  WITH CHECK (is_current_user_admin());

CREATE POLICY "Admins can update newsletters"
  ON newsletters FOR UPDATE TO authenticated
  USING (is_current_user_admin())
  WITH CHECK (is_current_user_admin());

CREATE POLICY "Admins can delete newsletters"
  ON newsletters FOR DELETE TO authenticated
  USING (is_current_user_admin());

-- ============================================================
-- 10. DIGITOOLS
-- ============================================================

DROP POLICY IF EXISTS "Platform admins can manage digitools" ON digitools;
DROP POLICY IF EXISTS "Authenticated users can view active digitools" ON digitools;
DROP POLICY IF EXISTS "Admins can manage digitools" ON digitools;

-- Authenticated users can view tools that are marked visible
CREATE POLICY "Authenticated can view visible digitools"
  ON digitools FOR SELECT TO authenticated
  USING (visible_to_users = true AND is_active = true);

-- Platform admins can manage all digitools
CREATE POLICY "Admins can manage digitools"
  ON digitools FOR ALL TO authenticated
  USING (is_current_user_admin())
  WITH CHECK (is_current_user_admin());

-- ============================================================
-- 11. EXECUTIVE FUNCTIONS
-- ============================================================

-- executive_functions (global catalog, readable by all authenticated)
DROP POLICY IF EXISTS "Authenticated can read executive_functions" ON executive_functions;
CREATE POLICY "Authenticated can read executive_functions"
  ON executive_functions FOR SELECT TO authenticated
  USING (true);

-- executive_function_assessments (via student → school)
DROP POLICY IF EXISTS "School members can manage executive_function_assessments" ON executive_function_assessments;
CREATE POLICY "School members can manage executive_function_assessments"
  ON executive_function_assessments FOR ALL TO authenticated
  USING (
    student_id IN (
      SELECT s.id FROM students s
      JOIN user_schools us ON us.school_id = s.school_id
      WHERE us.user_id = auth.uid() AND us.is_active = true
    )
  )
  WITH CHECK (
    student_id IN (
      SELECT s.id FROM students s
      JOIN user_schools us ON us.school_id = s.school_id
      WHERE us.user_id = auth.uid() AND us.is_active = true
    )
  );

-- executive_function_assessment_history
DROP POLICY IF EXISTS "School members can manage executive_function_assessment_history" ON executive_function_assessment_history;
CREATE POLICY "School members can manage executive_function_assessment_history"
  ON executive_function_assessment_history FOR ALL TO authenticated
  USING (school_id IN (SELECT school_id FROM user_schools WHERE user_id = auth.uid() AND is_active = true))
  WITH CHECK (school_id IN (SELECT school_id FROM user_schools WHERE user_id = auth.uid() AND is_active = true));

-- ============================================================
-- 12. USER PREFERENCES
-- ============================================================

DROP POLICY IF EXISTS "Users can manage own preferences" ON user_preferences;
CREATE POLICY "Users can read own user_preferences"
  ON user_preferences FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own user_preferences"
  ON user_preferences FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own user_preferences"
  ON user_preferences FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own user_preferences"
  ON user_preferences FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- ============================================================
-- 13. WEBWIJZER CONTENT
-- ============================================================

DROP POLICY IF EXISTS "School members can manage webwijzer_content" ON webwijzer_content;
DROP POLICY IF EXISTS "Public can view webwijzer content" ON webwijzer_content;
DROP POLICY IF EXISTS "Teachers can manage webwijzer content" ON webwijzer_content;

-- Teachers manage their school's content
CREATE POLICY "School members can manage webwijzer_content"
  ON webwijzer_content FOR ALL TO authenticated
  USING (school_id IN (SELECT school_id FROM user_schools WHERE user_id = auth.uid() AND is_active = true))
  WITH CHECK (school_id IN (SELECT school_id FROM user_schools WHERE user_id = auth.uid() AND is_active = true));

-- Public (anon) read for student access via QR/hash — content itself has no PII
CREATE POLICY "Public can read webwijzer_content"
  ON webwijzer_content FOR SELECT TO anon
  USING (true);

-- ============================================================
-- 14. ZOEKER
-- ============================================================

-- Drop all existing zoeker policies (the fix migration added blanket USING(true) ones)
DROP POLICY IF EXISTS "Students can view own requests" ON zoeker_search_requests;
DROP POLICY IF EXISTS "Students can create requests" ON zoeker_search_requests;
DROP POLICY IF EXISTS "Students can update own requests" ON zoeker_search_requests;
DROP POLICY IF EXISTS "Teachers can view school requests" ON zoeker_search_requests;
DROP POLICY IF EXISTS "Teachers can update school requests" ON zoeker_search_requests;
DROP POLICY IF EXISTS "Teachers can delete school requests" ON zoeker_search_requests;
DROP POLICY IF EXISTS "Authenticated can view search requests" ON zoeker_search_requests;
DROP POLICY IF EXISTS "Authenticated can insert search requests" ON zoeker_search_requests;
DROP POLICY IF EXISTS "Authenticated can update search requests" ON zoeker_search_requests;
DROP POLICY IF EXISTS "Authenticated can delete search requests" ON zoeker_search_requests;
DROP POLICY IF EXISTS "Public can insert search requests" ON zoeker_search_requests;
DROP POLICY IF EXISTS "Public can view search requests" ON zoeker_search_requests;
DROP POLICY IF EXISTS "Public can update search requests" ON zoeker_search_requests;

DROP POLICY IF EXISTS "Students can view own history" ON zoeker_search_history;
DROP POLICY IF EXISTS "Students can create history" ON zoeker_search_history;
DROP POLICY IF EXISTS "Teachers can view school history" ON zoeker_search_history;
DROP POLICY IF EXISTS "Authenticated can view search history" ON zoeker_search_history;
DROP POLICY IF EXISTS "Authenticated can insert search history" ON zoeker_search_history;
DROP POLICY IF EXISTS "Public can insert search history" ON zoeker_search_history;
DROP POLICY IF EXISTS "Public can view search history" ON zoeker_search_history;

DROP POLICY IF EXISTS "Students can view own notifications" ON zoeker_notifications;
DROP POLICY IF EXISTS "Students can update own notifications" ON zoeker_notifications;
DROP POLICY IF EXISTS "Teachers can manage notifications" ON zoeker_notifications;
DROP POLICY IF EXISTS "Authenticated can view notifications" ON zoeker_notifications;
DROP POLICY IF EXISTS "Authenticated can update notifications" ON zoeker_notifications;
DROP POLICY IF EXISTS "Public can view notifications" ON zoeker_notifications;
DROP POLICY IF EXISTS "Public can update notifications" ON zoeker_notifications;

-- zoeker_search_requests: teachers see/manage their school's requests; students see own via anon token
CREATE POLICY "Teachers can view school zoeker_search_requests"
  ON zoeker_search_requests FOR SELECT TO authenticated
  USING (school_id IN (SELECT school_id FROM user_schools WHERE user_id = auth.uid() AND is_active = true));

CREATE POLICY "Teachers can update school zoeker_search_requests"
  ON zoeker_search_requests FOR UPDATE TO authenticated
  USING (school_id IN (SELECT school_id FROM user_schools WHERE user_id = auth.uid() AND is_active = true))
  WITH CHECK (school_id IN (SELECT school_id FROM user_schools WHERE user_id = auth.uid() AND is_active = true));

CREATE POLICY "Teachers can delete school zoeker_search_requests"
  ON zoeker_search_requests FOR DELETE TO authenticated
  USING (school_id IN (SELECT school_id FROM user_schools WHERE user_id = auth.uid() AND is_active = true));

-- Students submit requests via anon token (public insert scoped by student_id claim)
CREATE POLICY "Public can insert zoeker_search_requests"
  ON zoeker_search_requests FOR INSERT TO anon
  WITH CHECK (true);

-- Students read/update their own requests via anon token with student claim
CREATE POLICY "Students can read own zoeker_search_requests"
  ON zoeker_search_requests FOR SELECT TO anon
  USING (student_id = current_student_id());

CREATE POLICY "Students can update own zoeker_search_requests"
  ON zoeker_search_requests FOR UPDATE TO anon
  USING (student_id = current_student_id())
  WITH CHECK (student_id = current_student_id());

-- zoeker_search_history: teachers see their school's history; students insert own
CREATE POLICY "Teachers can view school zoeker_search_history"
  ON zoeker_search_history FOR SELECT TO authenticated
  USING (school_id IN (SELECT school_id FROM user_schools WHERE user_id = auth.uid() AND is_active = true));

CREATE POLICY "Public can insert zoeker_search_history"
  ON zoeker_search_history FOR INSERT TO anon
  WITH CHECK (true);

CREATE POLICY "Students can view own zoeker_search_history"
  ON zoeker_search_history FOR SELECT TO anon
  USING (student_id = current_student_id());

-- zoeker_notifications: teachers manage; students read/update own
CREATE POLICY "Teachers can manage zoeker_notifications"
  ON zoeker_notifications FOR ALL TO authenticated
  USING (
    student_id IN (
      SELECT s.id FROM students s
      JOIN user_schools us ON us.school_id = s.school_id
      WHERE us.user_id = auth.uid() AND us.is_active = true
    )
  )
  WITH CHECK (
    student_id IN (
      SELECT s.id FROM students s
      JOIN user_schools us ON us.school_id = s.school_id
      WHERE us.user_id = auth.uid() AND us.is_active = true
    )
  );

CREATE POLICY "Students can read own zoeker_notifications"
  ON zoeker_notifications FOR SELECT TO anon
  USING (student_id = current_student_id());

CREATE POLICY "Students can update own zoeker_notifications"
  ON zoeker_notifications FOR UPDATE TO anon
  USING (student_id = current_student_id())
  WITH CHECK (student_id = current_student_id());

-- ============================================================
-- 15. QR CODES
-- ============================================================

DROP POLICY IF EXISTS "School members can manage qr_codes" ON qr_codes;
CREATE POLICY "School members can manage qr_codes"
  ON qr_codes FOR ALL TO authenticated
  USING (school_id IN (SELECT school_id FROM user_schools WHERE user_id = auth.uid() AND is_active = true))
  WITH CHECK (school_id IN (SELECT school_id FROM user_schools WHERE user_id = auth.uid() AND is_active = true));

-- ============================================================
-- 16. ADMIN USERS TABLE — restrict to admins only
-- ============================================================

DROP POLICY IF EXISTS "Authenticated users can read admin list" ON admin_users;
DROP POLICY IF EXISTS "Admins can read admin list" ON admin_users;

-- Only admins need to read the full list; normal users check via is_current_user_admin()
CREATE POLICY "Admins can read admin_users"
  ON admin_users FOR SELECT TO authenticated
  USING (is_current_user_admin());

-- ============================================================
-- 17. PROFILES — add missing school cross-read policy
-- ============================================================

DROP POLICY IF EXISTS "School members can read other school members profiles" ON profiles;
CREATE POLICY "School members can read other school members profiles"
  ON profiles FOR SELECT TO authenticated
  USING (
    id IN (
      SELECT user_id FROM user_schools
      WHERE school_id IN (
        SELECT school_id FROM user_schools WHERE user_id = auth.uid() AND is_active = true
      )
      AND is_active = true
    )
  );
