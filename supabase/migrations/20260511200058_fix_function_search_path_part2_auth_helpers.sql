/*
  # Fix mutable search_path on auth helper functions

  Fixes is_admin, is_current_user_admin, is_school_admin, is_school_member,
  is_super_admin, current_student_id, uid — all with SET search_path = ''
  and fully-qualified table references.
*/

CREATE OR REPLACE FUNCTION public.uid()
  RETURNS uuid LANGUAGE sql STABLE SET search_path = ''
AS $$
  SELECT auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.current_student_id()
  RETURNS uuid LANGUAGE sql STABLE SET search_path = ''
AS $$
  SELECT NULLIF((auth.jwt() ->> 'student_id'), '')::uuid
$$;

CREATE OR REPLACE FUNCTION public.is_admin(user_email text)
  RETURNS boolean LANGUAGE sql SECURITY DEFINER SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.admin_users
    WHERE email = user_email
  );
$$;

CREATE OR REPLACE FUNCTION public.is_current_user_admin()
  RETURNS boolean LANGUAGE sql SECURITY DEFINER SET search_path = ''
AS $$
  SELECT public.is_admin(auth.email());
$$;

CREATE OR REPLACE FUNCTION public.is_super_admin()
  RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.super_admins
    WHERE user_id = auth.uid()
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.is_school_member(target_school_id uuid)
  RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_schools
    WHERE user_id = auth.uid()
      AND school_id = target_school_id
      AND status = 'approved'
      AND is_active = true
  );
$$;

CREATE OR REPLACE FUNCTION public.is_school_admin(check_school_id uuid)
  RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.school_teammembers
    WHERE school_id = check_school_id
      AND user_id = auth.uid()
      AND role = 'admin'
      AND is_active = true
  );
$$;

CREATE OR REPLACE FUNCTION public.is_school_admin(user_id_input uuid, school_id_input uuid)
  RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.school_teammembers
    WHERE user_id = user_id_input
      AND school_id = school_id_input
      AND role = 'admin'
      AND is_active = true
  );
END;
$$;
