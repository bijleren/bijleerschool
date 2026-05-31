/*
  # Fix user_schools RLS circular dependency

  ## Problem
  The SELECT policy on user_schools contains a subquery that reads user_schools
  itself. With RLS enabled, this subquery is also subject to the policy, creating
  a circular evaluation:
    - Policy checks user_schools subquery → subquery is blocked by the same policy
    - Even the simple `user_id = auth.uid()` branch can be shadowed by this

  This is the same pattern already solved for admin_users via SECURITY DEFINER
  helper functions.

  ## Fix
  1. Create a SECURITY DEFINER function get_my_school_ids() that reads user_schools
     bypassing RLS, returning only the current user's approved+active school IDs.
  2. Replace the SELECT policy to use this function for the "see school members" branch.
  3. Replace the UPDATE/DELETE admin subqueries with a similar get_my_admin_school_ids()
     helper to avoid the same issue there.

  ## Security
  - Functions return only data for auth.uid() — no cross-user data exposure
  - EXECUTE restricted to authenticated role only
  - Policies themselves still enforce ownership
*/

-- Helper: returns school_ids the current user is an approved+active member of
CREATE OR REPLACE FUNCTION public.get_my_school_ids()
RETURNS setof uuid
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT school_id FROM public.user_schools
  WHERE user_id = auth.uid()
    AND status = 'approved'
    AND is_active = true;
$$;

-- Helper: returns school_ids where the current user is an approved+active admin
CREATE OR REPLACE FUNCTION public.get_my_admin_school_ids()
RETURNS setof uuid
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT school_id FROM public.user_schools
  WHERE user_id = auth.uid()
    AND role = 'admin'
    AND status = 'approved'
    AND is_active = true;
$$;

-- Restrict to authenticated only
REVOKE EXECUTE ON FUNCTION public.get_my_school_ids() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.get_my_admin_school_ids() FROM anon, public;
GRANT EXECUTE ON FUNCTION public.get_my_school_ids() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_admin_school_ids() TO authenticated;

-- Replace SELECT policy using the SECURITY DEFINER helper
DROP POLICY IF EXISTS "Users can read own or school member records" ON public.user_schools;

CREATE POLICY "Users can read own or school member records"
  ON public.user_schools FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR school_id IN (SELECT public.get_my_school_ids())
  );

-- Replace UPDATE policies using the helper
DROP POLICY IF EXISTS "Admins can update school member records" ON public.user_schools;

CREATE POLICY "Admins can update school member records"
  ON public.user_schools FOR UPDATE
  TO authenticated
  USING (school_id IN (SELECT public.get_my_admin_school_ids()))
  WITH CHECK (school_id IN (SELECT public.get_my_admin_school_ids()));

-- Replace DELETE policy using the helper
DROP POLICY IF EXISTS "Admins can delete school member records" ON public.user_schools;

CREATE POLICY "Admins can delete school member records"
  ON public.user_schools FOR DELETE
  TO authenticated
  USING (school_id IN (SELECT public.get_my_admin_school_ids()));
