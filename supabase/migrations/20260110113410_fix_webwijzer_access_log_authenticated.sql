/*
  # Fix WebWijzer Access Log for Authenticated Users
  
  ## Issue
  When teachers open a student's WebWijzer from the dashboard, they are authenticated.
  The access log insert fails because the policy only allows anonymous (anon) inserts.
  
  ## Changes
  Add INSERT policy for authenticated users to webwijzer_access_log table.
  
  ## Security
  - Both authenticated and anonymous users can log WebWijzer access
  - This allows teachers to open student WebWijzer views and students to access via public URL
*/

CREATE POLICY "Authenticated can log webwijzer access"
  ON webwijzer_access_log
  FOR INSERT
  TO authenticated
  WITH CHECK (true);
