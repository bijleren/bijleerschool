/*
  # Allow Public Access to WebWijzer Access Log

  1. Changes
    - Add policy to allow public (unauthenticated) INSERT access to webwijzer_access_log table
    - This enables logging of student access when they authenticate via QR code or manual code
  
  2. Security
    - Policy only allows INSERT operations
    - Students can only create log entries, not read or modify them
*/

-- Allow public to insert access logs
CREATE POLICY "Public can log webwijzer access"
  ON webwijzer_access_log
  FOR INSERT
  TO anon
  WITH CHECK (true);