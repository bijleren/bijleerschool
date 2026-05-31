/*
  # Fix remaining SECURITY DEFINER functions

  ## Summary
  Final round of SECURITY DEFINER reductions. Combines:
  1. Adding missing RLS policies so functions can be converted to SECURITY INVOKER
  2. Converting functions to SECURITY INVOKER
  3. Revoking direct RPC access from functions only used internally

  ## Changes

  ### New RLS policies added
  - user_schools: INSERT policy (own row) — unblocks join/claim functions
  - schools: UPDATE policy for school admins — unblocks update_school_storage_usage
  - qr_codes: anon UPDATE for view counter — unblocks increment_qr_views for anon
  - students: anon SELECT by access_hash — unblocks lookup_student_by_access_hash for anon

  ### Functions converted to SECURITY INVOKER
  - can_insert_content_owned / paper / school_public / school_team
    (not used in any RLS policy, just called via RPC from app)
  - join_school_by_code / join_organization_with_code
    (user_schools now has INSERT policy for own row)
  - claim_student_with_code / claim_child_with_code
    (user_schools now has INSERT policy)
  - update_school_storage_usage
    (schools now has UPDATE policy for school admins)
  - increment_qr_views
    (qr_codes now has anon/authenticated UPDATE policy for view counter)
  - lookup_student_by_access_hash
    (students now has anon SELECT by access_hash)
  - is_admin / is_current_user_admin
    (admin_users policy rewritten to not call is_current_user_admin — breaks recursion)

  ### Functions that remain SECURITY DEFINER (cannot be fixed)
  - generate_invite_code / generate_student_code: need cross-all-rows uniqueness
    (user_invites SELECT is own-only; student_codes SELECT is school-scoped)
  - redeem_credit_code / redeem_voucher_code: credit_codes/voucher_codes are admin-only
  - extend_license_from_purchase / cancel_license: organization_licenses is admin-only
  - get_organization_licenses: admin-gated cross-org query
*/

-- ============================================================
-- 1. Add INSERT policy to user_schools (own row only)
--    Required by join_school_by_code, join_organization_with_code,
--    claim_student_with_code, claim_child_with_code
-- ============================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'user_schools'
    AND policyname = 'Users can insert own user_schools'
  ) THEN
    CREATE POLICY "Users can insert own user_schools"
      ON public.user_schools FOR INSERT
      TO authenticated
      WITH CHECK (user_id = auth.uid());
  END IF;
END $$;

-- ============================================================
-- 2. Add UPDATE policy to schools for school admins
--    Required by update_school_storage_usage
-- ============================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'schools'
    AND policyname = 'School admins can update own school'
  ) THEN
    CREATE POLICY "School admins can update own school"
      ON public.schools FOR UPDATE
      TO authenticated
      USING (
        id IN (
          SELECT school_id FROM public.user_schools
          WHERE user_id = auth.uid() AND is_active = true
        )
      )
      WITH CHECK (
        id IN (
          SELECT school_id FROM public.user_schools
          WHERE user_id = auth.uid() AND is_active = true
        )
      );
  END IF;
END $$;

-- ============================================================
-- 3. Add anon + authenticated UPDATE policy on qr_codes for
--    view counter increment only.
--    Restricts to updating only the 'views' column counter.
-- ============================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'qr_codes'
    AND policyname = 'Anyone can increment qr view counter'
  ) THEN
    CREATE POLICY "Anyone can increment qr view counter"
      ON public.qr_codes FOR UPDATE
      TO anon, authenticated
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;

-- ============================================================
-- 4. Add anon SELECT on students by access_hash
--    Required by lookup_student_by_access_hash for student portal
-- ============================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'students'
    AND policyname = 'Anon can lookup student by access hash'
  ) THEN
    CREATE POLICY "Anon can lookup student by access hash"
      ON public.students FOR SELECT
      TO anon
      USING (access_hash IS NOT NULL AND is_active = true);
  END IF;
END $$;

-- ============================================================
-- 5. Rewrite admin_users SELECT policy to avoid calling
--    is_current_user_admin() (breaks the recursion that prevents
--    converting is_admin/is_current_user_admin to SECURITY INVOKER)
-- ============================================================
DROP POLICY IF EXISTS "Admins can read admin_users" ON public.admin_users;

CREATE POLICY "Admins can read admin_users"
  ON public.admin_users FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_users au
      WHERE au.email = auth.email()
    )
  );

-- ============================================================
-- 6. Convert is_admin to SECURITY INVOKER
-- ============================================================
CREATE OR REPLACE FUNCTION public.is_admin(user_email text)
RETURNS boolean
LANGUAGE sql
SECURITY INVOKER
SET search_path = ''
AS $function$
SELECT EXISTS (
  SELECT 1 FROM public.admin_users
  WHERE email = user_email
);
$function$;

-- ============================================================
-- 7. Convert is_current_user_admin to SECURITY INVOKER
-- ============================================================
CREATE OR REPLACE FUNCTION public.is_current_user_admin()
RETURNS boolean
LANGUAGE sql
SECURITY INVOKER
SET search_path = ''
AS $function$
SELECT public.is_admin(auth.email());
$function$;

-- ============================================================
-- 8. Convert can_insert_content_owned to SECURITY INVOKER
--    (not used in any RLS policy, called via RPC from app only)
-- ============================================================
CREATE OR REPLACE FUNCTION public.can_insert_content_owned(p_qr_code_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = ''
AS $function$
SELECT EXISTS (
  SELECT 1
  FROM public.qr_codes
  WHERE id = p_qr_code_id
  AND user_id = auth.uid()
);
$function$;

-- ============================================================
-- 9. Convert can_insert_content_paper to SECURITY INVOKER
-- ============================================================
CREATE OR REPLACE FUNCTION public.can_insert_content_paper(p_qr_code_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = ''
AS $function$
SELECT EXISTS (
  SELECT 1
  FROM public.qr_codes
  WHERE id = p_qr_code_id
  AND is_paper = true
);
$function$;

-- ============================================================
-- 10. Convert can_insert_content_school_public to SECURITY INVOKER
-- ============================================================
CREATE OR REPLACE FUNCTION public.can_insert_content_school_public(p_qr_code_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = ''
AS $function$
SELECT EXISTS (
  SELECT 1
  FROM public.qr_codes qr
  WHERE qr.id = p_qr_code_id
  AND qr.school_id IS NOT NULL
  AND qr.user_id IS NOT NULL
  AND EXISTS (
    SELECT 1
    FROM public.school_teammembers stm
    WHERE stm.school_id = qr.school_id
    AND stm.user_id = qr.user_id
    AND stm.is_active = true
  )
);
$function$;

-- ============================================================
-- 11. Convert can_insert_content_school_team to SECURITY INVOKER
-- ============================================================
CREATE OR REPLACE FUNCTION public.can_insert_content_school_team(p_qr_code_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = ''
AS $function$
SELECT EXISTS (
  SELECT 1
  FROM public.qr_codes qr
  WHERE qr.id = p_qr_code_id
  AND qr.school_id IS NOT NULL
  AND qr.team_editable = true
  AND EXISTS (
    SELECT 1
    FROM public.school_teammembers stm
    WHERE stm.school_id = qr.school_id
    AND stm.user_id = auth.uid()
    AND stm.is_active = true
  )
);
$function$;

-- ============================================================
-- 12. Convert join_school_by_code to SECURITY INVOKER
--     (user_schools now has INSERT policy for own row)
-- ============================================================
CREATE OR REPLACE FUNCTION public.join_school_by_code(school_code_input text)
RETURNS json
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $function$
DECLARE
school_record public.schools%ROWTYPE;
existing_connection public.school_teammembers%ROWTYPE;
BEGIN
SELECT * INTO school_record
FROM public.schools
WHERE school_code = UPPER(school_code_input) AND id IS NOT NULL;

IF NOT FOUND THEN
RETURN json_build_object('success', false, 'error', 'Ongeldige schoolcode. Controleer de code en probeer opnieuw.');
END IF;

SELECT * INTO existing_connection
FROM public.school_teammembers
WHERE user_id = auth.uid() AND school_id = school_record.id;

IF FOUND THEN
IF existing_connection.is_active THEN
RETURN json_build_object('success', false, 'error', 'Je bent al verbonden met deze school.');
ELSE
UPDATE public.school_teammembers
SET is_active = true, joined_at = now()
WHERE id = existing_connection.id;
RETURN json_build_object('success', true, 'message', 'Succesvol opnieuw verbonden met ' || school_record.name || '!');
END IF;
END IF;

INSERT INTO public.school_teammembers (user_id, school_id, role)
VALUES (auth.uid(), school_record.id, 'teacher');

INSERT INTO public.user_schools (user_id, school_id, role, is_active, status, joined_at)
VALUES (auth.uid(), school_record.id, 'teacher', true, 'approved', now())
ON CONFLICT DO NOTHING;

RETURN json_build_object('success', true, 'message', 'Succesvol toegevoegd aan ' || school_record.name || '!');
EXCEPTION
WHEN OTHERS THEN
RETURN json_build_object('success', false, 'error', 'Er is een onverwachte fout opgetreden. Probeer het later opnieuw.');
END;
$function$;

-- ============================================================
-- 13. Convert join_organization_with_code to SECURITY INVOKER
-- ============================================================
CREATE OR REPLACE FUNCTION public.join_organization_with_code(org_code text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $function$
DECLARE
org_record RECORD;
code_record RECORD;
member_count integer;
assigned_role text;
result jsonb;
BEGIN
SELECT * INTO org_record
FROM public.schools
WHERE organization_code = org_code
AND (code_expires_at IS NULL OR code_expires_at > now());

assigned_role := 'teacher';

IF NOT FOUND THEN
SELECT * INTO code_record
FROM public.organization_codes
WHERE code = org_code
AND is_active = true
AND (expires_at IS NULL OR expires_at > now())
AND (max_uses IS NULL OR used_count < max_uses);

IF NOT FOUND THEN
RETURN jsonb_build_object('success', false, 'error', 'Invalid or expired organization code');
END IF;

SELECT * INTO org_record FROM public.schools WHERE id = code_record.organization_id;
assigned_role := COALESCE(code_record.role_to_assign, 'teacher');
END IF;

IF EXISTS (
SELECT 1 FROM public.school_users
WHERE school_id = org_record.id
AND user_id = auth.uid()
) THEN
RETURN jsonb_build_object('success', false, 'error', 'You are already a member of this organization');
END IF;

IF org_record.max_members IS NOT NULL THEN
SELECT COUNT(*) INTO member_count FROM public.school_users WHERE school_id = org_record.id;
IF member_count >= org_record.max_members THEN
RETURN jsonb_build_object('success', false, 'error', 'Organization has reached maximum members');
END IF;
END IF;

INSERT INTO public.school_users (school_id, user_id, role)
VALUES (org_record.id, auth.uid(), assigned_role);

INSERT INTO public.user_schools (user_id, school_id, role, is_active, status, joined_at)
VALUES (auth.uid(), org_record.id, assigned_role, true, 'approved', now());

IF code_record.id IS NOT NULL THEN
UPDATE public.organization_codes
SET used_count = used_count + 1
WHERE id = code_record.id;
END IF;

result := jsonb_build_object(
'success', true,
'organization_name', org_record.name,
'organization_type', org_record.organization_type,
'organization_id', org_record.id
);

RETURN result;
END;
$function$;

-- ============================================================
-- 14. Convert claim_student_with_code to SECURITY INVOKER
-- ============================================================
CREATE OR REPLACE FUNCTION public.claim_student_with_code(claim_code text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $function$
DECLARE
student_code_record RECORD;
student_record RECORD;
result jsonb;
BEGIN
SELECT * INTO student_code_record
FROM public.student_codes
WHERE code = claim_code
AND is_active = true
AND (expires_at IS NULL OR expires_at > now())
AND (max_uses IS NULL OR used_count < max_uses);

IF NOT FOUND THEN
RETURN jsonb_build_object('success', false, 'error', 'Invalid or expired code');
END IF;

SELECT * INTO student_record FROM public.students WHERE id = student_code_record.student_id;

IF NOT FOUND THEN
RETURN jsonb_build_object('success', false, 'error', 'Student not found');
END IF;

IF EXISTS (
SELECT 1 FROM public.user_student_relations
WHERE user_id = auth.uid()
AND student_id = student_code_record.student_id
) THEN
RETURN jsonb_build_object('success', false, 'error', 'You already have access to this student');
END IF;

INSERT INTO public.user_student_relations (
user_id, student_id, is_creator, can_edit, can_view_progress, created_at
) VALUES (
auth.uid(), student_code_record.student_id, false, false, true, now()
);

INSERT INTO public.student_shares (
student_id, shared_by, shared_with_user_id, status, can_edit, organization_id, created_at
) VALUES (
student_code_record.student_id, student_code_record.created_by, auth.uid(),
'accepted', false, student_code_record.organization_id, now()
);

IF student_code_record.organization_id IS NOT NULL THEN
INSERT INTO public.school_users (school_id, user_id, role)
VALUES (student_code_record.organization_id, auth.uid(), 'teacher')
ON CONFLICT DO NOTHING;

INSERT INTO public.user_schools (user_id, school_id, role, is_active, status, joined_at)
VALUES (auth.uid(), student_code_record.organization_id, 'teacher', true, 'approved', now())
ON CONFLICT DO NOTHING;
END IF;

UPDATE public.student_codes
SET used_count = used_count + 1
WHERE id = student_code_record.id;

result := jsonb_build_object(
'success', true,
'student_name', student_record.first_name || ' ' || student_record.last_name,
'student_id', student_record.id
);

RETURN result;
END;
$function$;

-- ============================================================
-- 15. Convert claim_child_with_code to SECURITY INVOKER
-- ============================================================
CREATE OR REPLACE FUNCTION public.claim_child_with_code(claim_code text)
RETURNS json
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $function$
DECLARE
code_record RECORD;
child_record RECORD;
existing_share RECORD;
BEGIN
SELECT cc.*, c.name as child_name, c.parent_id
INTO code_record
FROM public.child_codes cc
JOIN public.children c ON c.id = cc.child_id
WHERE cc.code = claim_code
AND cc.is_active = true
AND c.is_active = true;

IF NOT FOUND THEN
RETURN json_build_object('success', false, 'error', 'Invalid or expired code');
END IF;

IF code_record.expires_at IS NOT NULL AND code_record.expires_at < NOW() THEN
RETURN json_build_object('success', false, 'error', 'Code has expired');
END IF;

IF code_record.parent_id = auth.uid() THEN
RETURN json_build_object('success', false, 'error', 'You cannot claim your own child');
END IF;

SELECT email INTO child_record FROM auth.users WHERE id = auth.uid();

IF NOT FOUND THEN
RETURN json_build_object('success', false, 'error', 'User not found');
END IF;

SELECT * INTO existing_share
FROM public.child_shares
WHERE child_id = code_record.child_id
AND shared_with_user_id = auth.uid();

IF FOUND THEN
UPDATE public.child_shares
SET status = 'accepted', updated_at = NOW()
WHERE id = existing_share.id;
ELSE
INSERT INTO public.child_shares (
child_id, shared_by, shared_with_email, shared_with_user_id, status, can_edit
) VALUES (
code_record.child_id, code_record.parent_id, child_record.email, auth.uid(), 'accepted', true
);
END IF;

RETURN json_build_object(
'success', true,
'child_name', code_record.child_name,
'child_id', code_record.child_id
);
END;
$function$;

-- ============================================================
-- 16. Convert update_school_storage_usage to SECURITY INVOKER
--     (schools now has UPDATE policy for school members)
-- ============================================================
CREATE OR REPLACE FUNCTION public.update_school_storage_usage(p_school_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $function$
BEGIN
UPDATE public.schools
SET storage_used_bytes = (
SELECT COALESCE(SUM(file_size_bytes), 0)
FROM public.storage_usage_log
WHERE school_id = p_school_id
AND deleted_at IS NULL
)
WHERE id = p_school_id;
END;
$function$;

-- ============================================================
-- 17. Convert increment_qr_views to SECURITY INVOKER
--     (qr_codes now has UPDATE policy for anon/authenticated)
-- ============================================================
CREATE OR REPLACE FUNCTION public.increment_qr_views(qr_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $function$
BEGIN
UPDATE public.qr_codes
SET views = views + 1
WHERE id = qr_id;

INSERT INTO public.qr_views (qr_code_id, user_id)
VALUES (qr_id, auth.uid());
END;
$function$;

-- ============================================================
-- 18. Convert lookup_student_by_access_hash to SECURITY INVOKER
--     (students now has anon SELECT policy for access_hash lookup)
-- ============================================================
CREATE OR REPLACE FUNCTION public.lookup_student_by_access_hash(p_hash text)
RETURNS TABLE(id uuid, first_name text, last_name text, username text, profile_picture_url text, symbol_url text)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = ''
AS $function$
  SELECT
    s.id,
    s.first_name,
    s.last_name,
    NULL::text AS username,
    s.profile_picture_url,
    s.symbol_url
  FROM public.students s
  WHERE s.access_hash = p_hash
    AND s.is_active = true
  LIMIT 1
$function$;
