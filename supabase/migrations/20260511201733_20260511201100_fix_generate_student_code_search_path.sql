/*
  # Fix generate_student_code mutable search path

  Recreates generate_student_code with SET search_path = '' to prevent
  search path injection attacks. Fully qualifies the student_codes table reference.
*/

CREATE OR REPLACE FUNCTION public.generate_student_code()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_code text;
  v_exists boolean;
BEGIN
  LOOP
    v_code := upper(substring(md5(random()::text) from 1 for 6));
    SELECT EXISTS(
      SELECT 1 FROM public.student_codes WHERE code = v_code AND is_active = true
    ) INTO v_exists;
    EXIT WHEN NOT v_exists;
  END LOOP;
  RETURN v_code;
END;
$$;
