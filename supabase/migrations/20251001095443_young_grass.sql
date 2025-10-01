/*
  # Fix teammembers table RLS policy

  1. Security Updates
    - Update INSERT policy to allow school members to create teammember profiles for other users in their school
    - Maintain existing policies for other operations
    - Ensure proper authorization checks

  This fixes the issue where adding teachers to groups fails due to RLS policy violations.
*/

-- Drop existing INSERT policy if it exists
DROP POLICY IF EXISTS "Users can insert own teammember profile" ON public.teammembers;

-- Create new INSERT policy that allows school members to create teammember profiles
CREATE POLICY "School members can create teammember profiles" 
ON public.teammembers FOR INSERT WITH CHECK (
  -- Allow a user to create their own teammember profile
  (auth.uid() = user_id)
  OR
  -- Allow school members to create teammember profiles for other users in their school
  EXISTS (
    SELECT 1
    FROM public.user_schools us_current
    JOIN public.user_schools us_target ON us_target.school_id = us_current.school_id
    WHERE us_current.user_id = auth.uid()
      AND us_current.status = 'approved'
      AND us_current.is_active = TRUE
      AND us_target.user_id = teammembers.user_id
      AND us_target.status = 'approved'
      AND us_target.is_active = TRUE
  )
);