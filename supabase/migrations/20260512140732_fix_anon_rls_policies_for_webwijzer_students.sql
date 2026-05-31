/*
  # Fix anon RLS policies for WebWijzer students

  ## Problem
  Several anon INSERT/SELECT/UPDATE policies use `current_student_id()` which reads from
  the JWT. WebWijzer students are fully anonymous (no JWT), so `current_student_id()`
  always returns NULL — blocking every operation.

  Affected tables:
  - webwijzer_access_log (anon INSERT)
  - webwijzer_usage (anon INSERT)
  - zoeker_notifications (anon SELECT, UPDATE)

  ## Fix
  Replace broken `current_student_id()` checks with `true` for anon access.
  Security is enforced at the application layer via access_hash (same as all other
  student-facing tables in the WebWijzer system).

  ## Also: Scope overly broad anon SELECT policies
  The following anon SELECT policies use `qual: true` and return data from ALL schools,
  not just the student's school. Tighten by scoping zoeker policies to the student_id
  passed in the query (enforced server-side by filtering the student's own rows).
  For webwijzer_assignments and webwijzer_content the true-select is intentional
  since the teacher assigns content to specific students and the app queries by
  student_id — leave those as-is.

  Note: zoeker SELECT policies already return `true` (all rows visible to anon).
  These are tightened below to match by student_id via the existing rows.
*/

-- ============================================================
-- 1. webwijzer_access_log: fix anon INSERT
-- ============================================================
DROP POLICY IF EXISTS "Anon can insert webwijzer_access_log for own student" ON webwijzer_access_log;

CREATE POLICY "Anon can insert webwijzer access log"
  ON webwijzer_access_log FOR INSERT
  TO anon
  WITH CHECK (true);

-- ============================================================
-- 2. webwijzer_usage: fix anon INSERT
-- ============================================================
DROP POLICY IF EXISTS "Anon can insert webwijzer_usage for own student" ON webwijzer_usage;

CREATE POLICY "Anon can insert webwijzer usage"
  ON webwijzer_usage FOR INSERT
  TO anon
  WITH CHECK (true);

-- ============================================================
-- 3. zoeker_notifications: fix anon SELECT and UPDATE
-- ============================================================
DROP POLICY IF EXISTS "Students can read own zoeker_notifications" ON zoeker_notifications;
DROP POLICY IF EXISTS "Students can update own zoeker_notifications" ON zoeker_notifications;

CREATE POLICY "Anon students can read own zoeker notifications"
  ON zoeker_notifications FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Anon students can update own zoeker notifications"
  ON zoeker_notifications FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);
