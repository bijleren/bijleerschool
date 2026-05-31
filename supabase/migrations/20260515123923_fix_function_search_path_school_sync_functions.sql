/*
  # Fix search_path on school sync and helper functions

  ## Problem
  A previous security hardening migration set search_path='' (empty) on several
  functions that reference public schema tables without schema-qualifying them.
  This causes "relation does not exist" errors at runtime because the tables
  can't be resolved with an empty search path.

  ## Affected functions
  - sync_user_schools_to_teammembers (trigger) — references school_teammembers
  - sync_teammembers_to_user_schools (trigger) — references user_schools
  - is_school_admin (x2) — references school_teammembers
  - join_school_by_code — references school_teammembers, schools, user_schools
  - can_insert_content_school_public — references school_teammembers, qr_codes
  - can_insert_content_school_team — references school_teammembers, qr_codes
  - user_is_school_member_for_folder — already fixed (search_path=public), skip

  ## Fix
  Re-create each function with search_path=public so unqualified table names
  resolve correctly, while keeping all other properties identical.
*/

-- sync_user_schools_to_teammembers
CREATE OR REPLACE FUNCTION public.sync_user_schools_to_teammembers()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF current_setting('app.syncing_from_teammembers', true) = 'true' THEN
    RETURN NEW;
  END IF;

  PERFORM set_config('app.syncing_from_user_schools', 'true', true);

  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    IF NEW.status = 'approved' AND NEW.is_active = true THEN
      INSERT INTO school_teammembers (user_id, school_id, role, joined_at, is_active, invited_by)
      VALUES (NEW.user_id, NEW.school_id, NEW.role, NEW.joined_at, NEW.is_active, NULL)
      ON CONFLICT (user_id, school_id)
      DO UPDATE SET
        role = EXCLUDED.role,
        is_active = EXCLUDED.is_active,
        joined_at = LEAST(school_teammembers.joined_at, EXCLUDED.joined_at);
    ELSIF TG_OP = 'UPDATE' AND (NEW.status != 'approved' OR NEW.is_active = false) THEN
      DELETE FROM school_teammembers
      WHERE user_id = NEW.user_id AND school_id = NEW.school_id;
    END IF;

    PERFORM set_config('app.syncing_from_user_schools', 'false', true);
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    DELETE FROM school_teammembers
    WHERE user_id = OLD.user_id AND school_id = OLD.school_id;

    PERFORM set_config('app.syncing_from_user_schools', 'false', true);
    RETURN OLD;
  END IF;
END;
$$;

-- sync_teammembers_to_user_schools
CREATE OR REPLACE FUNCTION public.sync_teammembers_to_user_schools()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF current_setting('app.syncing_from_user_schools', true) = 'true' THEN
    RETURN NEW;
  END IF;

  PERFORM set_config('app.syncing_from_teammembers', 'true', true);

  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    IF NEW.is_active = true THEN
      INSERT INTO user_schools (user_id, school_id, role, joined_at, is_active, status)
      VALUES (NEW.user_id, NEW.school_id, NEW.role, NEW.joined_at, NEW.is_active, 'approved')
      ON CONFLICT (user_id, school_id)
      DO UPDATE SET
        role = EXCLUDED.role,
        is_active = EXCLUDED.is_active,
        status = 'approved',
        joined_at = LEAST(user_schools.joined_at, EXCLUDED.joined_at);
    ELSIF TG_OP = 'UPDATE' AND NEW.is_active = false THEN
      UPDATE user_schools
      SET is_active = false
      WHERE user_id = NEW.user_id AND school_id = NEW.school_id;
    END IF;

    PERFORM set_config('app.syncing_from_teammembers', 'false', true);
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    DELETE FROM user_schools
    WHERE user_id = OLD.user_id AND school_id = OLD.school_id;

    PERFORM set_config('app.syncing_from_teammembers', 'false', true);
    RETURN OLD;
  END IF;
END;
$$;

-- is_school_admin (uuid variant)
CREATE OR REPLACE FUNCTION public.is_school_admin(check_school_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM school_teammembers
    WHERE school_id = check_school_id
      AND user_id = auth.uid()
      AND role = 'admin'
      AND is_active = true
  );
$$;

-- is_school_admin (uuid, uuid variant)
CREATE OR REPLACE FUNCTION public.is_school_admin(user_id_input uuid, school_id_input uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM school_teammembers
    WHERE user_id = user_id_input
      AND school_id = school_id_input
      AND role = 'admin'
      AND is_active = true
  );
END;
$$;

-- join_school_by_code
CREATE OR REPLACE FUNCTION public.join_school_by_code(school_code_input text)
RETURNS json
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  school_record schools%ROWTYPE;
  existing_connection school_teammembers%ROWTYPE;
BEGIN
  SELECT * INTO school_record
  FROM schools
  WHERE school_code = UPPER(school_code_input) AND id IS NOT NULL;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Ongeldige schoolcode. Controleer de code en probeer opnieuw.');
  END IF;

  SELECT * INTO existing_connection
  FROM school_teammembers
  WHERE user_id = auth.uid() AND school_id = school_record.id;

  IF FOUND THEN
    IF existing_connection.is_active THEN
      RETURN json_build_object('success', false, 'error', 'Je bent al verbonden met deze school.');
    ELSE
      UPDATE school_teammembers
      SET is_active = true, joined_at = now()
      WHERE id = existing_connection.id;
      RETURN json_build_object('success', true, 'message', 'Succesvol opnieuw verbonden met ' || school_record.name || '!');
    END IF;
  END IF;

  INSERT INTO school_teammembers (user_id, school_id, role)
  VALUES (auth.uid(), school_record.id, 'teacher');

  INSERT INTO user_schools (user_id, school_id, role, is_active, status, joined_at)
  VALUES (auth.uid(), school_record.id, 'teacher', true, 'approved', now())
  ON CONFLICT DO NOTHING;

  RETURN json_build_object('success', true, 'message', 'Succesvol toegevoegd aan ' || school_record.name || '!');
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', 'Er is een onverwachte fout opgetreden. Probeer het later opnieuw.');
END;
$$;

-- can_insert_content_school_public
CREATE OR REPLACE FUNCTION public.can_insert_content_school_public(p_qr_code_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM qr_codes qr
    WHERE qr.id = p_qr_code_id
      AND qr.school_id IS NOT NULL
      AND qr.user_id IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM school_teammembers stm
        WHERE stm.school_id = qr.school_id
          AND stm.user_id = qr.user_id
          AND stm.is_active = true
      )
  );
$$;

-- can_insert_content_school_team
CREATE OR REPLACE FUNCTION public.can_insert_content_school_team(p_qr_code_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM qr_codes qr
    WHERE qr.id = p_qr_code_id
      AND qr.school_id IS NOT NULL
      AND qr.team_editable = true
      AND EXISTS (
        SELECT 1 FROM school_teammembers stm
        WHERE stm.school_id = qr.school_id
          AND stm.user_id = auth.uid()
          AND stm.is_active = true
      )
  );
$$;
