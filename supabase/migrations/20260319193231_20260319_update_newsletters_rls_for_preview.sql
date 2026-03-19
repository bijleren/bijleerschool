/*
  # Update newsletters RLS to support preview logic

  ## Summary
  Updates the `newsletters` table RLS policies so that:
  - ALL authenticated users can view newsletters where `preview = false`
  - Only non-premium school users can view newsletters where `preview = true`
  - Admins (platform admins) can view all newsletters
  - The old "Premium school users can view newsletters" policy is replaced

  ### Policy logic
  1. Non-preview newsletters → visible to all authenticated users
  2. Preview newsletters → visible only to users whose school has `premium_school = 0` or NULL

  ### Modified Tables
  - `newsletters` — updated SELECT policy
*/

DROP POLICY IF EXISTS "Premium school users can view newsletters" ON newsletters;
DROP POLICY IF EXISTS "Authenticated users can view non-preview newsletters" ON newsletters;
DROP POLICY IF EXISTS "Non-premium users can view preview newsletters" ON newsletters;

CREATE POLICY "Authenticated users can view non-preview newsletters"
  ON newsletters FOR SELECT
  TO authenticated
  USING (preview = false);

CREATE POLICY "Non-premium users can view preview newsletters"
  ON newsletters FOR SELECT
  TO authenticated
  USING (
    preview = true
    AND EXISTS (
      SELECT 1 FROM user_schools
      JOIN schools ON schools.id = user_schools.school_id
      WHERE user_schools.user_id = auth.uid()
      AND user_schools.is_active = true
      AND user_schools.status = 'approved'
      AND (schools.premium_school IS NULL OR schools.premium_school = 0)
    )
  );
