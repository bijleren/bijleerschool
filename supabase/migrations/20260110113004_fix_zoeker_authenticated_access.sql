/*
  # Fix Zoeker Access for Both Authenticated and Anonymous Users
  
  ## Issue
  The student Zoeker modal is opened by authenticated teachers, so queries
  are made with the teacher's session. We need to allow both authenticated
  and anonymous access to Zoeker tables.
  
  ## Changes
  Add policies for authenticated users to access Zoeker tables in addition
  to the existing anon policies.
  
  ## Security
  - Frontend validates access via student access_hash
  - Both teachers and students (via teacher session) can access
*/

-- Add authenticated policies for zoeker_search_requests
CREATE POLICY "Authenticated can insert search requests"
  ON zoeker_search_requests FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated can view search requests"
  ON zoeker_search_requests FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated can update search requests"
  ON zoeker_search_requests FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated can delete search requests"
  ON zoeker_search_requests FOR DELETE
  TO authenticated
  USING (true);

-- Add authenticated policies for zoeker_search_history
CREATE POLICY "Authenticated can insert search history"
  ON zoeker_search_history FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated can view search history"
  ON zoeker_search_history FOR SELECT
  TO authenticated
  USING (true);

-- Add authenticated policies for zoeker_notifications
CREATE POLICY "Authenticated can view notifications"
  ON zoeker_notifications FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated can update notifications"
  ON zoeker_notifications FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);
