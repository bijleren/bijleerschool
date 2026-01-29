/*
  # Add Time-Limited Board Activation System

  1. Schema Changes
    - Add `active_until` timestamptz column to store when board should auto-deactivate
    - Add `activated_at` timestamptz column to track when board was activated
    - Add `activated_by` uuid column to track which teacher activated the board
    - Add `icon_url` text column to store custom uploaded icon/image URL
    - Add `board_icon` text column to store Lucide icon name for predefined icons
  
  2. Performance
    - Add index on `active_until` for efficient expiry checks
  
  3. Functions
    - Create function to check and deactivate expired boards
    - Create function to end sessions for expired boards
*/

-- Add activation timestamp columns
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'activity_boards' AND column_name = 'active_until'
  ) THEN
    ALTER TABLE activity_boards ADD COLUMN active_until timestamptz;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'activity_boards' AND column_name = 'activated_at'
  ) THEN
    ALTER TABLE activity_boards ADD COLUMN activated_at timestamptz;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'activity_boards' AND column_name = 'activated_by'
  ) THEN
    ALTER TABLE activity_boards ADD COLUMN activated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Add icon/image columns
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'activity_boards' AND column_name = 'icon_url'
  ) THEN
    ALTER TABLE activity_boards ADD COLUMN icon_url text;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'activity_boards' AND column_name = 'board_icon'
  ) THEN
    ALTER TABLE activity_boards ADD COLUMN board_icon text DEFAULT 'Grid';
  END IF;
END $$;

-- Add index for efficient expiry queries
CREATE INDEX IF NOT EXISTS idx_activity_boards_active_until 
  ON activity_boards(active_until) 
  WHERE is_active = true AND active_until IS NOT NULL;

-- Function to deactivate expired boards and end their sessions
CREATE OR REPLACE FUNCTION deactivate_expired_boards()
RETURNS TABLE(
  board_id uuid,
  board_name text,
  sessions_ended integer
) AS $$
DECLARE
  expired_board RECORD;
  session_count integer;
BEGIN
  FOR expired_board IN 
    SELECT id, name 
    FROM activity_boards 
    WHERE is_active = true 
      AND active_until IS NOT NULL 
      AND active_until <= NOW()
  LOOP
    -- End all active sessions for this board
    UPDATE activity_sessions
    SET end_time = expired_board.active_until
    WHERE board_id = expired_board.id 
      AND end_time IS NULL;
    
    GET DIAGNOSTICS session_count = ROW_COUNT;
    
    -- Deactivate the board
    UPDATE activity_boards
    SET is_active = false,
        updated_at = NOW()
    WHERE id = expired_board.id;
    
    -- Return result for this board
    board_id := expired_board.id;
    board_name := expired_board.name;
    sessions_ended := session_count;
    
    RETURN NEXT;
  END LOOP;
  
  RETURN;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if a board has expired (useful for real-time checks)
CREATE OR REPLACE FUNCTION is_board_expired(board_id_param uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM activity_boards 
    WHERE id = board_id_param 
      AND is_active = true 
      AND active_until IS NOT NULL 
      AND active_until <= NOW()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;