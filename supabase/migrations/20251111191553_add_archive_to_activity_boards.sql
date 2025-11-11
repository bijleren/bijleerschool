/*
  # Add archive functionality to activity boards

  1. Changes
    - Add `archived_at` column to activity_boards table
    - When a board is "archived", the timestamp is set but data remains accessible
    - Archived boards don't appear in normal list but can be viewed in archive
    - deleted_at is for permanent deletion (cascades to all related data)

  2. Notes
    - archived_at is nullable - NULL means board is active
    - Boards can be unarchived by setting archived_at to NULL
    - Archived boards preserve all data and can be restored
    - deleted_at takes precedence - deleted boards won't show even in archive
*/

-- Add archived_at column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'activity_boards' AND column_name = 'archived_at'
  ) THEN
    ALTER TABLE activity_boards ADD COLUMN archived_at timestamptz;
  END IF;
END $$;
