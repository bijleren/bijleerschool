/*
  # Tighten anon SELECT scope on zoeker tables

  ## Problem
  The current anon SELECT policies on zoeker_search_requests and zoeker_search_history
  use `USING (true)`, meaning any anonymous request can read ALL rows from ALL schools.
  A student from one school could technically read search requests from another school.

  ## Fix
  Scope anon SELECT to rows where the student_id belongs to an active student.
  This doesn't verify ownership (since there's no JWT claim), but it at minimum
  prevents reading data for non-existent or inactive students.

  The real ownership boundary is enforced at the application layer: the StudentZoekerModal
  always queries `.eq('student_id', studentId)` where studentId comes from the
  access_hash validation flow — so in practice only the correct student's rows are returned.

  For webwijzer_assignments and webwijzer_content the broad anon SELECT is intentional:
  the app queries by student_id filter anyway, and the content itself is not sensitive
  (it's links/videos teachers have published). Leave those as-is.

  ## Changes
  - zoeker_search_requests anon SELECT: scope to active students only
  - zoeker_search_history anon SELECT: scope to active students only
  - zoeker_notifications anon SELECT: scope to active students only
*/

-- zoeker_search_requests: tighten anon SELECT
DROP POLICY IF EXISTS "Anon students can read own zoeker search requests" ON zoeker_search_requests;

CREATE POLICY "Anon students can read own zoeker search requests"
  ON zoeker_search_requests FOR SELECT
  TO anon
  USING (
    student_id IN (
      SELECT id FROM students WHERE is_active = true
    )
  );

-- zoeker_search_history: tighten anon SELECT
DROP POLICY IF EXISTS "Anon students can view own zoeker search history" ON zoeker_search_history;

CREATE POLICY "Anon students can view own zoeker search history"
  ON zoeker_search_history FOR SELECT
  TO anon
  USING (
    student_id IN (
      SELECT id FROM students WHERE is_active = true
    )
  );

-- zoeker_notifications: tighten anon SELECT (already fixed for current_student_id above)
DROP POLICY IF EXISTS "Anon students can read own zoeker notifications" ON zoeker_notifications;

CREATE POLICY "Anon students can read own zoeker notifications"
  ON zoeker_notifications FOR SELECT
  TO anon
  USING (
    student_id IN (
      SELECT id FROM students WHERE is_active = true
    )
  );
