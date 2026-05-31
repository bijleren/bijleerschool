/*
  # Restore SECURITY DEFINER on admin helper functions

  ## Problem
  is_admin() and is_current_user_admin() were converted to SECURITY INVOKER
  in a previous security hardening migration. However, these functions are
  used inside RLS policies (including the admin_users SELECT policy itself)
  to check whether the current user is an admin.

  Since admin_users has RLS enabled, a SECURITY INVOKER function running as
  a regular user cannot read admin_users at all — creating a circular deadlock:
  - is_current_user_admin() → SELECT admin_users → RLS checks is_current_user_admin() → ...

  SECURITY DEFINER is the correct and intentional setting here: these functions
  need elevated access to read the admin_users table regardless of the caller's
  RLS context. They are safe because they only return a boolean (not raw data),
  and their EXECUTE permission is already restricted to authenticated users only.

  ## Changes
  - Restore is_admin(text) to SECURITY DEFINER
  - Restore is_current_user_admin() to SECURITY DEFINER
*/

CREATE OR REPLACE FUNCTION public.is_admin(user_email text)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $function$
SELECT EXISTS (
  SELECT 1 FROM public.admin_users
  WHERE email = user_email
);
$function$;

CREATE OR REPLACE FUNCTION public.is_current_user_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $function$
SELECT public.is_admin(auth.email());
$function$;

-- Ensure only authenticated users can call these (not anon)
REVOKE EXECUTE ON FUNCTION public.is_admin(text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_current_user_admin() FROM anon;
GRANT EXECUTE ON FUNCTION public.is_admin(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_current_user_admin() TO authenticated;
