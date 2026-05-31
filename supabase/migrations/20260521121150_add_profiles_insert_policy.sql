/*
  # Add INSERT policy to profiles table

  ## Problem
  During registration, the app inserts a new profile row immediately after
  supabase.auth.signUp(). The profiles table had no INSERT policy, so this
  failed with a 403 RLS violation, preventing users from completing registration.

  ## Fix
  Add an INSERT policy that allows a newly authenticated user to create their
  own profile row (where id matches their auth.uid()).
*/

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (id = auth.uid());
