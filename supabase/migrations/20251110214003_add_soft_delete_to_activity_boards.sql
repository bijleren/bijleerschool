/*
  # Add soft delete to activity boards

  1. Changes
    - Add `deleted_at` column to activity_boards table for soft deletion
    - When a board is "deleted", the timestamp is set instead of removing the record
    - This preserves all historical usage data (activity_sessions, collaboration_logs, etc.)
    
  2. Notes
    - deleted_at is nullable - NULL means board is active
    - Boards with deleted_at set should not appear in normal queries
    - All related data (sessions, options, etc.) remains intact for historical purposes
*/

-- Add deleted_at column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'activity_boards' AND column_name = 'deleted_at'
  ) THEN
    ALTER TABLE activity_boards ADD COLUMN deleted_at timestamptz;
  END IF;
END $$;
