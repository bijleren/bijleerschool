/*
  # Add missing RLS policies for remaining no-policy tables
  All column structures verified against actual schema.
*/

-- super_admins
CREATE POLICY "Authenticated can read super_admins"
  ON super_admins FOR SELECT TO authenticated USING (true);

-- didactiek_faq
CREATE POLICY "Authenticated can read didactiek_faq"
  ON didactiek_faq FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can insert didactiek_faq"
  ON didactiek_faq FOR INSERT TO authenticated WITH CHECK (is_current_user_admin());
CREATE POLICY "Admins can update didactiek_faq"
  ON didactiek_faq FOR UPDATE TO authenticated
  USING (is_current_user_admin()) WITH CHECK (is_current_user_admin());
CREATE POLICY "Admins can delete didactiek_faq"
  ON didactiek_faq FOR DELETE TO authenticated USING (is_current_user_admin());

-- didactiek_vormingen
CREATE POLICY "Authenticated can read didactiek_vormingen"
  ON didactiek_vormingen FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can insert didactiek_vormingen"
  ON didactiek_vormingen FOR INSERT TO authenticated WITH CHECK (is_current_user_admin());
CREATE POLICY "Admins can update didactiek_vormingen"
  ON didactiek_vormingen FOR UPDATE TO authenticated
  USING (is_current_user_admin()) WITH CHECK (is_current_user_admin());
CREATE POLICY "Admins can delete didactiek_vormingen"
  ON didactiek_vormingen FOR DELETE TO authenticated USING (is_current_user_admin());

-- qa_sessions
CREATE POLICY "Authenticated can read qa_sessions"
  ON qa_sessions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can insert qa_sessions"
  ON qa_sessions FOR INSERT TO authenticated WITH CHECK (is_current_user_admin());
CREATE POLICY "Admins can update qa_sessions"
  ON qa_sessions FOR UPDATE TO authenticated
  USING (is_current_user_admin()) WITH CHECK (is_current_user_admin());
CREATE POLICY "Admins can delete qa_sessions"
  ON qa_sessions FOR DELETE TO authenticated USING (is_current_user_admin());

-- teaching_techniques
CREATE POLICY "Authenticated can read teaching_techniques"
  ON teaching_techniques FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage teaching_techniques"
  ON teaching_techniques FOR ALL TO authenticated
  USING (is_current_user_admin()) WITH CHECK (is_current_user_admin());

CREATE POLICY "Authenticated can read teaching_technique_categories"
  ON teaching_technique_categories FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage teaching_technique_categories"
  ON teaching_technique_categories FOR ALL TO authenticated
  USING (is_current_user_admin()) WITH CHECK (is_current_user_admin());

CREATE POLICY "Authenticated can read teaching_technique_age_groups"
  ON teaching_technique_age_groups FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage teaching_technique_age_groups"
  ON teaching_technique_age_groups FOR ALL TO authenticated
  USING (is_current_user_admin()) WITH CHECK (is_current_user_admin());

CREATE POLICY "Authenticated can read teaching_technique_subjects"
  ON teaching_technique_subjects FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage teaching_technique_subjects"
  ON teaching_technique_subjects FOR ALL TO authenticated
  USING (is_current_user_admin()) WITH CHECK (is_current_user_admin());

CREATE POLICY "Authenticated can read teaching_technique_materials"
  ON teaching_technique_materials FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage teaching_technique_materials"
  ON teaching_technique_materials FOR ALL TO authenticated
  USING (is_current_user_admin()) WITH CHECK (is_current_user_admin());

CREATE POLICY "Authenticated can read technique_categories"
  ON technique_categories FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage technique_categories"
  ON technique_categories FOR ALL TO authenticated
  USING (is_current_user_admin()) WITH CHECK (is_current_user_admin());

CREATE POLICY "Authenticated can read technique_coaches"
  ON technique_coaches FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage technique_coaches"
  ON technique_coaches FOR ALL TO authenticated
  USING (is_current_user_admin()) WITH CHECK (is_current_user_admin());

CREATE POLICY "Authenticated can read technique_comments"
  ON technique_comments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage technique_comments"
  ON technique_comments FOR ALL TO authenticated
  USING (is_current_user_admin()) WITH CHECK (is_current_user_admin());

CREATE POLICY "Authenticated can read executive_function_tasks"
  ON executive_function_tasks FOR SELECT TO authenticated USING (true);

-- behavior_presets
CREATE POLICY "Authenticated can read behavior_presets"
  ON behavior_presets FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can manage own behavior_presets"
  ON behavior_presets FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- behavior_scenarios (no school_id, platform-managed)
CREATE POLICY "Authenticated can read behavior_scenarios"
  ON behavior_scenarios FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage behavior_scenarios"
  ON behavior_scenarios FOR ALL TO authenticated
  USING (is_current_user_admin()) WITH CHECK (is_current_user_admin());

-- webwijzer_assignments (content_id → webwijzer_content → school_id)
CREATE POLICY "School members can manage webwijzer_assignments"
  ON webwijzer_assignments FOR ALL TO authenticated
  USING (
    content_id IN (
      SELECT id FROM webwijzer_content
      WHERE school_id IN (SELECT school_id FROM user_schools WHERE user_id = auth.uid() AND is_active = true)
    )
  )
  WITH CHECK (
    content_id IN (
      SELECT id FROM webwijzer_content
      WHERE school_id IN (SELECT school_id FROM user_schools WHERE user_id = auth.uid() AND is_active = true)
    )
  );
CREATE POLICY "Public can read webwijzer_assignments"
  ON webwijzer_assignments FOR SELECT TO anon USING (true);

-- webwijzer_usage (student_id)
CREATE POLICY "School members can read webwijzer_usage"
  ON webwijzer_usage FOR SELECT TO authenticated
  USING (
    student_id IN (
      SELECT s.id FROM students s
      JOIN user_schools us ON us.school_id = s.school_id
      WHERE us.user_id = auth.uid() AND us.is_active = true
    )
  );
CREATE POLICY "Public can insert webwijzer_usage"
  ON webwijzer_usage FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Authenticated can insert webwijzer_usage"
  ON webwijzer_usage FOR INSERT TO authenticated WITH CHECK (true);

-- webwijzer_access_log (student_id)
CREATE POLICY "School members can read webwijzer_access_log"
  ON webwijzer_access_log FOR SELECT TO authenticated
  USING (
    student_id IN (
      SELECT s.id FROM students s
      JOIN user_schools us ON us.school_id = s.school_id
      WHERE us.user_id = auth.uid() AND us.is_active = true
    )
  );
CREATE POLICY "Public can insert webwijzer_access_log"
  ON webwijzer_access_log FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Authenticated can insert webwijzer_access_log"
  ON webwijzer_access_log FOR INSERT TO authenticated WITH CHECK (true);

-- zoeker_settings
CREATE POLICY "School members can manage zoeker_settings"
  ON zoeker_settings FOR ALL TO authenticated
  USING (school_id IN (SELECT school_id FROM user_schools WHERE user_id = auth.uid() AND is_active = true))
  WITH CHECK (school_id IN (SELECT school_id FROM user_schools WHERE user_id = auth.uid() AND is_active = true));

-- student_books
CREATE POLICY "School members can manage student_books"
  ON student_books FOR ALL TO authenticated
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
CREATE POLICY "Students can read own student_books"
  ON student_books FOR SELECT TO authenticated
  USING (student_id = current_student_id());

-- student_grades
CREATE POLICY "School members can manage student_grades"
  ON student_grades FOR ALL TO authenticated
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

-- group_grades
CREATE POLICY "School members can manage group_grades"
  ON group_grades FOR ALL TO authenticated
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

-- behavior_card_increments
CREATE POLICY "School members can manage behavior_card_increments"
  ON behavior_card_increments FOR ALL TO authenticated
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

-- technique_usage_logs
CREATE POLICY "School members can manage technique_usage_logs"
  ON technique_usage_logs FOR ALL TO authenticated
  USING (school_id IN (SELECT school_id FROM user_schools WHERE user_id = auth.uid() AND is_active = true))
  WITH CHECK (school_id IN (SELECT school_id FROM user_schools WHERE user_id = auth.uid() AND is_active = true));

-- student_tag_definitions
CREATE POLICY "School members can manage student_tag_definitions"
  ON student_tag_definitions FOR ALL TO authenticated
  USING (school_id IN (SELECT school_id FROM user_schools WHERE user_id = auth.uid() AND is_active = true))
  WITH CHECK (school_id IN (SELECT school_id FROM user_schools WHERE user_id = auth.uid() AND is_active = true));

-- student_tag_assignments
CREATE POLICY "School members can manage student_tag_assignments"
  ON student_tag_assignments FOR ALL TO authenticated
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

-- student_tag_log (read only, written by trigger)
CREATE POLICY "School members can read student_tag_log"
  ON student_tag_log FOR SELECT TO authenticated
  USING (
    student_id IN (
      SELECT s.id FROM students s
      JOIN user_schools us ON us.school_id = s.school_id
      WHERE us.user_id = auth.uid() AND us.is_active = true
    )
  );

-- storage_usage_log
CREATE POLICY "School members can read own storage_usage_log"
  ON storage_usage_log FOR SELECT TO authenticated
  USING (school_id IN (SELECT school_id FROM user_schools WHERE user_id = auth.uid() AND is_active = true));
CREATE POLICY "Authenticated can insert storage_usage_log"
  ON storage_usage_log FOR INSERT TO authenticated
  WITH CHECK (school_id IN (SELECT school_id FROM user_schools WHERE user_id = auth.uid() AND is_active = true));
CREATE POLICY "Authenticated can update own storage_usage_log"
  ON storage_usage_log FOR UPDATE TO authenticated
  USING (school_id IN (SELECT school_id FROM user_schools WHERE user_id = auth.uid() AND is_active = true))
  WITH CHECK (school_id IN (SELECT school_id FROM user_schools WHERE user_id = auth.uid() AND is_active = true));

-- qr_content_items
CREATE POLICY "School members can manage qr_content_items"
  ON qr_content_items FOR ALL TO authenticated
  USING (
    qr_code_id IN (
      SELECT id FROM qr_codes
      WHERE school_id IN (SELECT school_id FROM user_schools WHERE user_id = auth.uid() AND is_active = true)
    )
  )
  WITH CHECK (
    qr_code_id IN (
      SELECT id FROM qr_codes
      WHERE school_id IN (SELECT school_id FROM user_schools WHERE user_id = auth.uid() AND is_active = true)
    )
  );

-- qr_views
CREATE POLICY "School members can read qr_views"
  ON qr_views FOR SELECT TO authenticated
  USING (
    qr_code_id IN (
      SELECT id FROM qr_codes
      WHERE school_id IN (SELECT school_id FROM user_schools WHERE user_id = auth.uid() AND is_active = true)
    )
  );
CREATE POLICY "Public can insert qr_views"
  ON qr_views FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Authenticated can insert qr_views"
  ON qr_views FOR INSERT TO authenticated WITH CHECK (true);

-- user_profiles
CREATE POLICY "Users can read own user_profiles"
  ON user_profiles FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users can insert own user_profiles"
  ON user_profiles FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own user_profiles"
  ON user_profiles FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- user_invites
CREATE POLICY "Users can read own user_invites"
  ON user_invites FOR SELECT TO authenticated
  USING (invited_user_id = auth.uid());
CREATE POLICY "Authenticated can insert user_invites"
  ON user_invites FOR INSERT TO authenticated WITH CHECK (true);

-- user_favorites
CREATE POLICY "Users can manage own user_favorites"
  ON user_favorites FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- user_progress
CREATE POLICY "Users can manage own user_progress"
  ON user_progress FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- pricing_tiers / product_catalog
CREATE POLICY "Authenticated can read pricing_tiers"
  ON pricing_tiers FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage pricing_tiers"
  ON pricing_tiers FOR ALL TO authenticated
  USING (is_current_user_admin()) WITH CHECK (is_current_user_admin());

CREATE POLICY "Authenticated can read product_catalog"
  ON product_catalog FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage product_catalog"
  ON product_catalog FOR ALL TO authenticated
  USING (is_current_user_admin()) WITH CHECK (is_current_user_admin());

-- organization_licenses
CREATE POLICY "School members can read own organization_licenses"
  ON organization_licenses FOR SELECT TO authenticated
  USING (organization_id IN (SELECT school_id FROM user_schools WHERE user_id = auth.uid() AND is_active = true));
CREATE POLICY "Admins can manage organization_licenses"
  ON organization_licenses FOR ALL TO authenticated
  USING (is_current_user_admin()) WITH CHECK (is_current_user_admin());

-- license_transactions
CREATE POLICY "School members can read own license_transactions"
  ON license_transactions FOR SELECT TO authenticated
  USING (organization_id IN (SELECT school_id FROM user_schools WHERE user_id = auth.uid() AND is_active = true));
CREATE POLICY "Admins can manage license_transactions"
  ON license_transactions FOR ALL TO authenticated
  USING (is_current_user_admin()) WITH CHECK (is_current_user_admin());

-- credit_codes
CREATE POLICY "Admins can manage credit_codes"
  ON credit_codes FOR ALL TO authenticated
  USING (is_current_user_admin()) WITH CHECK (is_current_user_admin());

-- credit_transactions
CREATE POLICY "Users can read own credit_transactions"
  ON credit_transactions FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Admins can read all credit_transactions"
  ON credit_transactions FOR SELECT TO authenticated USING (is_current_user_admin());

-- organization_codes
CREATE POLICY "School members can manage organization_codes"
  ON organization_codes FOR ALL TO authenticated
  USING (organization_id IN (SELECT school_id FROM user_schools WHERE user_id = auth.uid() AND is_active = true))
  WITH CHECK (organization_id IN (SELECT school_id FROM user_schools WHERE user_id = auth.uid() AND is_active = true));

-- key_stats
CREATE POLICY "Admins can manage key_stats"
  ON key_stats FOR ALL TO authenticated
  USING (is_current_user_admin()) WITH CHECK (is_current_user_admin());

-- voucher_codes
CREATE POLICY "Admins can manage voucher_codes"
  ON voucher_codes FOR ALL TO authenticated
  USING (is_current_user_admin()) WITH CHECK (is_current_user_admin());

-- coupon_codes
CREATE POLICY "Authenticated can read active coupon_codes"
  ON coupon_codes FOR SELECT TO authenticated USING (is_active = true);
CREATE POLICY "Admins can manage coupon_codes"
  ON coupon_codes FOR ALL TO authenticated
  USING (is_current_user_admin()) WITH CHECK (is_current_user_admin());

-- school_teammembers
CREATE POLICY "School members can read school_teammembers"
  ON school_teammembers FOR SELECT TO authenticated
  USING (school_id IN (SELECT school_id FROM user_schools WHERE user_id = auth.uid() AND is_active = true));
CREATE POLICY "Users can manage own school_teammembers entry"
  ON school_teammembers FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- school_users
CREATE POLICY "School members can read school_users"
  ON school_users FOR SELECT TO authenticated
  USING (school_id IN (SELECT school_id FROM user_schools WHERE user_id = auth.uid() AND is_active = true));
CREATE POLICY "Users can manage own school_users entry"
  ON school_users FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- teammembers (no school_id, user_id only)
CREATE POLICY "Users can read own teammembers entry"
  ON teammembers FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users can manage own teammembers entry"
  ON teammembers FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- student_organizations
CREATE POLICY "School members can manage student_organizations"
  ON student_organizations FOR ALL TO authenticated
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

-- student_shares
CREATE POLICY "Users can manage own student_shares"
  ON student_shares FOR ALL TO authenticated
  USING (shared_by = auth.uid() OR shared_with_user_id = auth.uid())
  WITH CHECK (shared_by = auth.uid());

-- demo tables
CREATE POLICY "Public can insert demo_registrations"
  ON demo_registrations FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Admins can manage demo_registrations"
  ON demo_registrations FOR ALL TO authenticated
  USING (is_current_user_admin()) WITH CHECK (is_current_user_admin());

CREATE POLICY "Public can insert demo_sessions"
  ON demo_sessions FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Admins can manage demo_sessions"
  ON demo_sessions FOR ALL TO authenticated
  USING (is_current_user_admin()) WITH CHECK (is_current_user_admin());

CREATE POLICY "Admins can manage demo_platforms"
  ON demo_platforms FOR ALL TO authenticated
  USING (is_current_user_admin()) WITH CHECK (is_current_user_admin());
CREATE POLICY "Authenticated can read demo_platforms"
  ON demo_platforms FOR SELECT TO authenticated USING (true);
