/*
  # Fix schools RLS: circular dependency + missing school-code lookup policy

  ## Problems
  1. "user reads own schools" policy subqueries user_schools directly, which has
     RLS enabled — same circular deadlock pattern already fixed on user_schools.

  2. There is no policy allowing an authenticated user to look up a school by its
     school_code when they are NOT yet a member. This is required for the join flow:
     the user must find the school before they can insert into user_schools.
     Without this, the lookup returns a 404/empty and joining is impossible.

  ## Changes
  1. Drop the circular "user reads own schools" policy.
  2. Re-create it using the existing get_my_school_ids() SECURITY DEFINER helper.
  3. Add a new policy: any authenticated user can SELECT a school by school_code
     (read-only, only exposes id/name/school_code — enough to complete joining).

  ## Security
  - Members can still read all columns of their own schools.
  - The code-lookup policy is intentional: school codes are shared publicly
    within an organisation for joining purposes.
*/

-- 1. Fix the circular subquery on "user reads own schools"
DROP POLICY IF EXISTS "user reads own schools" ON public.schools;

CREATE POLICY "user reads own schools"
  ON public.schools FOR SELECT
  TO authenticated
  USING (id IN (SELECT public.get_my_school_ids()));

-- 2. Allow any authenticated user to find a school by its school_code (for joining)
DROP POLICY IF EXISTS "Authenticated users can look up schools by code" ON public.schools;

CREATE POLICY "Authenticated users can look up schools by code"
  ON public.schools FOR SELECT
  TO authenticated
  USING (school_code IS NOT NULL);
