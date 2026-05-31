/*
  # Allow authenticated users to create schools

  ## Problem
  The schools INSERT policy only allowed platform admins (admin_users table).
  Regular authenticated users (teachers) could not create a school during
  onboarding or from the schools tab, resulting in a 403 RLS error.

  ## Fix
  Add an INSERT policy that allows any authenticated user to create a school.
  The created_by column is checked to match their own user id, ensuring
  users can only create schools attributed to themselves.
*/

CREATE POLICY "Authenticated users can create schools"
  ON public.schools FOR INSERT
  TO authenticated
  WITH CHECK (created_by = auth.uid());
