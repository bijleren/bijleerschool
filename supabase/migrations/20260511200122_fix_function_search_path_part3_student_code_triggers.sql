/*
  # Fix mutable search_path on student code / hash generator functions
*/

CREATE OR REPLACE FUNCTION public.generate_access_hash()
  RETURNS text LANGUAGE plpgsql SET search_path = ''
AS $$
BEGIN
  RETURN encode(gen_random_bytes(32), 'base64');
END;
$$;

CREATE OR REPLACE FUNCTION public.set_student_access_hash()
  RETURNS trigger LANGUAGE plpgsql SET search_path = ''
AS $$
BEGIN
  IF NEW.access_hash IS NULL THEN
    NEW.access_hash := public.generate_access_hash();
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.generate_unique_school_code()
  RETURNS text LANGUAGE plpgsql SET search_path = ''
AS $$
DECLARE
  chars text := 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  result text := '';
  i integer;
  code_exists boolean;
BEGIN
  LOOP
    result := '';
    FOR i IN 1..6 LOOP
      result := result || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
    END LOOP;
    SELECT EXISTS(SELECT 1 FROM public.schools WHERE school_code = result) INTO code_exists;
    EXIT WHEN NOT code_exists;
  END LOOP;
  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION public.ensure_school_code()
  RETURNS trigger LANGUAGE plpgsql SET search_path = ''
AS $$
BEGIN
  IF NEW.school_code IS NULL OR NEW.school_code = '' THEN
    NEW.school_code := public.generate_unique_school_code();
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.auto_generate_student_code()
  RETURNS trigger LANGUAGE plpgsql SET search_path = ''
AS $$
DECLARE
  new_code text;
BEGIN
  IF NEW.color IS NULL OR NEW.color = '' THEN
    NEW.color := '#3B82F6';
  END IF;
  IF NEW.access_hash IS NULL OR NEW.access_hash = '' THEN
    NEW.access_hash := public.generate_access_hash();
  END IF;
  IF NEW.student_code IS NULL OR NEW.student_code = '' THEN
    LOOP
      new_code := public.generate_student_code();
      EXIT WHEN NOT EXISTS (SELECT 1 FROM public.students WHERE student_code = new_code);
    END LOOP;
    NEW.student_code := new_code;
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.ensure_single_default_student_role()
  RETURNS trigger LANGUAGE plpgsql SET search_path = ''
AS $$
BEGIN
  IF NEW.is_default = true THEN
    UPDATE public.student_roles
    SET is_default = false
    WHERE school_id = NEW.school_id
      AND id != NEW.id
      AND is_default = true;
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.archive_student_on_deactivate()
  RETURNS trigger LANGUAGE plpgsql SET search_path = ''
AS $$
BEGIN
  IF OLD.is_active = TRUE AND NEW.is_active = FALSE THEN
    NEW.school_id := '117abcca-2b02-4c3e-af50-8bf92ba60d93';
    NEW.access_hash := NULL;
    NEW.last_name := 'archive';
  END IF;
  RETURN NEW;
END;
$$;
