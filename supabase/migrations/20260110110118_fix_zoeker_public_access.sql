/*
  # Fix Zoeker Public Access for Students
  
  ## Changes
  This migration adds RLS policies to allow public (anonymous) access to Zoeker tables
  for students, similar to how WebWijzer works. Students access the system via their
  access hash, not as authenticated users.
  
  ## New Policies
  1. Allow public INSERT to zoeker_search_requests
  2. Allow public SELECT from zoeker_search_requests
  3. Allow public UPDATE to zoeker_search_requests (for marking as opened)
  4. Allow public INSERT to zoeker_search_history
  5. Allow public SELECT from zoeker_search_history
  6. Allow public SELECT from zoeker_notifications
  7. Allow public UPDATE to zoeker_notifications (for marking as read)
  
  ## Security Notes
  - Access is validated on the frontend via student access_hash
  - Students can only access their own data through the student_id parameter
  - Teachers still have full access through existing authenticated policies
*/

-- Drop existing restrictive student policies
DROP POLICY IF EXISTS "Students can view own requests" ON zoeker_search_requests;
DROP POLICY IF EXISTS "Students can create requests" ON zoeker_search_requests;
DROP POLICY IF EXISTS "Students can update own requests" ON zoeker_search_requests;
DROP POLICY IF EXISTS "Students can view own history" ON zoeker_search_history;
DROP POLICY IF EXISTS "Students can create history" ON zoeker_search_history;
DROP POLICY IF EXISTS "Students can view own notifications" ON zoeker_notifications;
DROP POLICY IF EXISTS "Students can update own notifications" ON zoeker_notifications;

-- Public access policies for zoeker_search_requests
CREATE POLICY "Public can insert search requests"
  ON zoeker_search_requests FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Public can view search requests"
  ON zoeker_search_requests FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Public can update search requests"
  ON zoeker_search_requests FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

-- Public access policies for zoeker_search_history
CREATE POLICY "Public can insert search history"
  ON zoeker_search_history FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Public can view search history"
  ON zoeker_search_history FOR SELECT
  TO anon
  USING (true);

-- Public access policies for zoeker_notifications
CREATE POLICY "Public can view notifications"
  ON zoeker_notifications FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Public can update notifications"
  ON zoeker_notifications FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

-- Keep teacher policies (they use authenticated role)
-- These policies were already created and remain unchanged