/*
  # Add Visibility and Premium Controls to DigiTools
  
  This migration adds visibility and premium access controls to the digitools system.
  
  1. New Columns
    - `visible_to_users` (boolean) - Controls whether regular users can see the tool
    - `requires_premium` (boolean) - Restricts access to premium school users only
  
  2. Security Updates
    - Update RLS policies to respect visibility and premium requirements
    - Non-authenticated users can only see tools marked as visible
    - Premium-only tools are filtered based on user's school premium status
*/

-- Add new columns to digitools table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'digitools' AND column_name = 'visible_to_users'
  ) THEN
    ALTER TABLE digitools ADD COLUMN visible_to_users boolean DEFAULT true;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'digitools' AND column_name = 'requires_premium'
  ) THEN
    ALTER TABLE digitools ADD COLUMN requires_premium boolean DEFAULT false;
  END IF;
END $$;

-- Drop existing public view policy
DROP POLICY IF EXISTS "Public can view active digitools" ON digitools;

-- Create new policy for non-premium users (authenticated and anon)
CREATE POLICY "Users can view visible active digitools"
  ON digitools FOR SELECT
  TO authenticated, anon
  USING (
    is_active = true 
    AND visible_to_users = true
    AND requires_premium = false
  );

-- Create policy for premium users
CREATE POLICY "Premium users can view premium digitools"
  ON digitools FOR SELECT
  TO authenticated
  USING (
    is_active = true 
    AND visible_to_users = true
    AND requires_premium = true
    AND EXISTS (
      SELECT 1 FROM user_schools us
      JOIN schools s ON s.id = us.school_id
      WHERE us.user_id = auth.uid() 
      AND s.premium_school = 1
    )
  );
