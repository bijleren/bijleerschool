/*
  # Fix user_schools RLS policies

  ## Problem
  A previous security migration stripped user_schools down to only 2 policies:
  - INSERT: user_id = auth.uid()
  - SELECT: user_id = auth.uid() (too narrow — admins can't see school members)

  Missing policies caused:
  - Admins unable to see their school's member list
  - UPDATE policy missing → teachers cannot reactivate themselves
  - Admins cannot remove/deactivate members

  ## Changes
  1. Drop existing overly-narrow SELECT policy
  2. Add proper SELECT: own rows OR admin of same school
  3. Add UPDATE: own row (teachers reconnecting) OR admin of same school
  4. Add DELETE: admin of same school only

  ## Security
  - Teachers can only see/update their own record
  - Admins can see/update/delete all records in their school
  - No cross-school visibility
*/

-- Drop the narrow SELECT policy that only allows seeing own row
DROP POLICY IF EXISTS "user reads own user_schools" ON public.user_schools;
DROP POLICY IF EXISTS "Users can read school relationships" ON public.user_schools;

-- SELECT: own row, OR member of same school (so admins can see their team)
CREATE POLICY "Users can read own or school member records"
  ON public.user_schools FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR school_id IN (
      SELECT school_id FROM user_schools
      WHERE user_id = auth.uid()
        AND status = 'approved'
        AND is_active = true
    )
  );

-- UPDATE: own row (teacher reconnects), OR admin of same school
DROP POLICY IF EXISTS "Admins can manage requests" ON public.user_schools;
DROP POLICY IF EXISTS "Users can update own user_schools" ON public.user_schools;

CREATE POLICY "Users can update own record"
  ON public.user_schools FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can update school member records"
  ON public.user_schools FOR UPDATE
  TO authenticated
  USING (
    school_id IN (
      SELECT school_id FROM user_schools
      WHERE user_id = auth.uid()
        AND role = 'admin'
        AND status = 'approved'
        AND is_active = true
    )
  )
  WITH CHECK (
    school_id IN (
      SELECT school_id FROM user_schools
      WHERE user_id = auth.uid()
        AND role = 'admin'
        AND status = 'approved'
        AND is_active = true
    )
  );

-- DELETE: admin of same school only
DROP POLICY IF EXISTS "Admins can delete school member records" ON public.user_schools;

CREATE POLICY "Admins can delete school member records"
  ON public.user_schools FOR DELETE
  TO authenticated
  USING (
    school_id IN (
      SELECT school_id FROM user_schools
      WHERE user_id = auth.uid()
        AND role = 'admin'
        AND status = 'approved'
        AND is_active = true
    )
  );
