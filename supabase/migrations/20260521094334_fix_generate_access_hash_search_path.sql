/*
  # Fix generate_access_hash function search path

  ## Problem
  The generate_access_hash function calls gen_random_bytes() from pgcrypto,
  but the function's search_path does not include the extensions schema where
  pgcrypto functions live in Supabase, causing a "function does not exist" error
  when inserting students.

  ## Fix
  Recreate generate_access_hash with an explicit schema-qualified call to
  extensions.gen_random_bytes so it resolves correctly regardless of search_path.
*/

CREATE OR REPLACE FUNCTION public.generate_access_hash()
RETURNS text
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, extensions
AS $$
BEGIN
  RETURN encode(gen_random_bytes(32), 'base64');
END;
$$;
