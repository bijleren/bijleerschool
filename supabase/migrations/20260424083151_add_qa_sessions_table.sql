/*
  # Create Q&A Sessions Table

  ## Summary
  Adds a table to store planned Q&A sessions (live Teams meetings) that users
  can join and add to their calendars.

  ## New Tables

  ### `qa_sessions`
  - `id` (uuid, primary key)
  - `date` (date) — the calendar date of the session
  - `start_time` (time) — when the session begins
  - `end_time` (time) — when the session ends
  - `teams_link` (text) — URL to the Teams meeting
  - `title` (text, nullable) — optional label; UI auto-generates one when null
  - `created_by` (uuid) — FK to auth.users, who created the session
  - `created_at` (timestamptz)

  ## Security
  - RLS enabled; table locked down by default
  - Authenticated users can read all sessions (needed to show upcoming sessions
    and to power the global notification bubble)
  - Only platform admins (via is_current_user_admin()) can insert, update, delete
*/

CREATE TABLE IF NOT EXISTS qa_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date date NOT NULL,
  start_time time NOT NULL,
  end_time time NOT NULL,
  teams_link text NOT NULL,
  title text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE qa_sessions ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_qa_sessions_date_start ON qa_sessions (date, start_time);

-- All authenticated users can read sessions (for upcoming list + notification bubble)
CREATE POLICY "Authenticated users can read qa sessions"
  ON qa_sessions FOR SELECT
  TO authenticated
  USING (true);

-- Only platform admins can create sessions
CREATE POLICY "Admins can insert qa sessions"
  ON qa_sessions FOR INSERT
  TO authenticated
  WITH CHECK (is_current_user_admin());

-- Only platform admins can update sessions
CREATE POLICY "Admins can update qa sessions"
  ON qa_sessions FOR UPDATE
  TO authenticated
  USING (is_current_user_admin())
  WITH CHECK (is_current_user_admin());

-- Only platform admins can delete sessions
CREATE POLICY "Admins can delete qa sessions"
  ON qa_sessions FOR DELETE
  TO authenticated
  USING (is_current_user_admin());
