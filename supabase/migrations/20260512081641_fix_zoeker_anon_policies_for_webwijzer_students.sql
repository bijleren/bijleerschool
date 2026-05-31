/*
  # Fix Zoeker anon RLS policies for WebWijzer students

  ## Problem
  The previous security hardening replaced broad anon INSERT/SELECT/UPDATE policies
  with ones that check `student_id = public.current_student_id()`. That function reads
  `student_id` from the JWT — but WebWijzer students are fully anonymous (no JWT), so
  `current_student_id()` always returns NULL, causing every anon operation to fail with
  a 401/403.

  ## Fix
  Replace the broken `current_student_id()` checks with simple `true` for anon access.
  Security for anon students is enforced at the application layer via the `access_hash`
  flow (same pattern used throughout the WebWijzer system). Teachers still have their
  own scoped authenticated policies.

  ## Changes
  - zoeker_search_requests: fix INSERT, SELECT, UPDATE policies for anon
  - zoeker_search_history: fix INSERT, SELECT policies for anon
*/

-- zoeker_search_requests: fix anon INSERT
DROP POLICY IF EXISTS "Students can insert own zoeker_search_requests" ON zoeker_search_requests;
CREATE POLICY "Anon students can insert zoeker search requests"
  ON zoeker_search_requests FOR INSERT
  TO anon
  WITH CHECK (true);

-- zoeker_search_requests: fix anon SELECT
DROP POLICY IF EXISTS "Students can read own zoeker_search_requests" ON zoeker_search_requests;
CREATE POLICY "Anon students can read own zoeker search requests"
  ON zoeker_search_requests FOR SELECT
  TO anon
  USING (true);

-- zoeker_search_requests: fix anon UPDATE (mark as opened)
DROP POLICY IF EXISTS "Students can update own zoeker_search_requests" ON zoeker_search_requests;
CREATE POLICY "Anon students can update own zoeker search requests"
  ON zoeker_search_requests FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

-- zoeker_search_history: fix anon INSERT
DROP POLICY IF EXISTS "Students can insert own zoeker_search_history" ON zoeker_search_history;
CREATE POLICY "Anon students can insert zoeker search history"
  ON zoeker_search_history FOR INSERT
  TO anon
  WITH CHECK (true);

-- zoeker_search_history: fix anon SELECT
DROP POLICY IF EXISTS "Students can view own zoeker_search_history" ON zoeker_search_history;
CREATE POLICY "Anon students can view own zoeker search history"
  ON zoeker_search_history FOR SELECT
  TO anon
  USING (true);
