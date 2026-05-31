/*
  # Fix RLS always-true INSERT policies

  Replaces INSERT policies that use WITH CHECK (true) with properly scoped checks.

  Tables addressed:
  - contact_messages: public form; scope to non-null email (minimal validation at boundary)
  - demo_registrations: public signup; scope to non-null email
  - demo_sessions: admin-managed; remove public insert (admins use the ALL policy)
  - exercise_attempts: woordenschat platform; scope to authenticated only (no user_id column)
  - new_words: scope via batch_id -> import_batches.imported_by = auth.uid()
  - qr_views: authenticated scope to own user_id; anon scope to null user_id (anonymous scan)
  - user_invites: scope inviter_id = auth.uid()
  - webwijzer_access_log: anon via current_student_id(); authenticated via school membership
  - webwijzer_usage: anon via current_student_id(); authenticated via school membership
*/

-- ============================================================
-- contact_messages
-- ============================================================
DROP POLICY IF EXISTS "anyone submits contact_messages" ON public.contact_messages;

CREATE POLICY "Public can insert contact_messages with email"
  ON public.contact_messages
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (email IS NOT NULL AND email <> '');

-- ============================================================
-- demo_registrations: public can register (email required)
-- ============================================================
DROP POLICY IF EXISTS "Public can insert demo_registrations" ON public.demo_registrations;

CREATE POLICY "Public can insert demo_registrations with email"
  ON public.demo_registrations
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (email IS NOT NULL AND email <> '');

-- ============================================================
-- demo_sessions: public insert was too broad — remove it
-- Admins manage sessions via the existing ALL policy
-- ============================================================
DROP POLICY IF EXISTS "Public can insert demo_sessions" ON public.demo_sessions;

-- ============================================================
-- exercise_attempts (woordenschat): no user_id column; restrict to authenticated
-- ============================================================
DROP POLICY IF EXISTS "auth inserts exercise_attempts" ON public.exercise_attempts;

CREATE POLICY "Authenticated can insert exercise_attempts"
  ON public.exercise_attempts
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

-- ============================================================
-- new_words: scope via batch_id -> import_batches.imported_by
-- ============================================================
DROP POLICY IF EXISTS "auth inserts new_words" ON public.new_words;

CREATE POLICY "Authenticated can insert own batch new_words"
  ON public.new_words
  FOR INSERT
  TO authenticated
  WITH CHECK (
    batch_id IN (
      SELECT id FROM public.import_batches
      WHERE imported_by = auth.uid()
    )
  );

-- ============================================================
-- qr_views: authenticated scoped to own user_id; anon for null user_id scans
-- ============================================================
DROP POLICY IF EXISTS "Authenticated can insert qr_views" ON public.qr_views;
DROP POLICY IF EXISTS "Public can insert qr_views" ON public.qr_views;

CREATE POLICY "Authenticated can insert own qr_views"
  ON public.qr_views
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Anon can insert anonymous qr_views"
  ON public.qr_views
  FOR INSERT
  TO anon
  WITH CHECK (user_id IS NULL);

-- ============================================================
-- user_invites: inviter must be the authenticated user
-- ============================================================
DROP POLICY IF EXISTS "Authenticated can insert user_invites" ON public.user_invites;

CREATE POLICY "Authenticated can insert own user_invites"
  ON public.user_invites
  FOR INSERT
  TO authenticated
  WITH CHECK (inviter_id = auth.uid());

-- ============================================================
-- webwijzer_access_log
-- ============================================================
DROP POLICY IF EXISTS "Authenticated can insert webwijzer_access_log" ON public.webwijzer_access_log;
DROP POLICY IF EXISTS "Public can insert webwijzer_access_log" ON public.webwijzer_access_log;

CREATE POLICY "Authenticated can insert webwijzer_access_log for own students"
  ON public.webwijzer_access_log
  FOR INSERT
  TO authenticated
  WITH CHECK (
    student_id IN (
      SELECT s.id FROM public.students s
      JOIN public.user_schools us ON us.school_id = s.school_id
      WHERE us.user_id = auth.uid() AND us.is_active = true
    )
  );

CREATE POLICY "Anon can insert webwijzer_access_log for own student"
  ON public.webwijzer_access_log
  FOR INSERT
  TO anon
  WITH CHECK (student_id = public.current_student_id());

-- ============================================================
-- webwijzer_usage
-- ============================================================
DROP POLICY IF EXISTS "Authenticated can insert webwijzer_usage" ON public.webwijzer_usage;
DROP POLICY IF EXISTS "Public can insert webwijzer_usage" ON public.webwijzer_usage;

CREATE POLICY "Authenticated can insert webwijzer_usage for own students"
  ON public.webwijzer_usage
  FOR INSERT
  TO authenticated
  WITH CHECK (
    student_id IN (
      SELECT s.id FROM public.students s
      JOIN public.user_schools us ON us.school_id = s.school_id
      WHERE us.user_id = auth.uid() AND us.is_active = true
    )
  );

CREATE POLICY "Anon can insert webwijzer_usage for own student"
  ON public.webwijzer_usage
  FOR INSERT
  TO anon
  WITH CHECK (student_id = public.current_student_id());
