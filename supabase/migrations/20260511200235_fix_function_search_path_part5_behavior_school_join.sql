/*
  # Fix mutable search_path on behavior cards, school join, and reorder functions
*/

CREATE OR REPLACE FUNCTION public.increment_behavior_card(p_card_id uuid, p_student_id uuid, p_increment_value integer DEFAULT 1)
  RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_new_count integer;
BEGIN
  INSERT INTO public.behavior_card_progress (card_id, student_id, total_count, last_incremented_at)
  VALUES (p_card_id, p_student_id, p_increment_value, now())
  ON CONFLICT (card_id, student_id)
  DO UPDATE SET
    total_count = public.behavior_card_progress.total_count + p_increment_value,
    last_incremented_at = now(),
    updated_at = now()
  RETURNING total_count INTO v_new_count;

  INSERT INTO public.behavior_card_increments (card_id, student_id, increment_value, incremented_at)
  VALUES (p_card_id, p_student_id, p_increment_value, now());

  RETURN v_new_count;
END;
$$;

CREATE OR REPLACE FUNCTION public.decrement_behavior_card(p_card_id uuid, p_student_id uuid, p_decrement_value integer DEFAULT 1)
  RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_new_count integer;
BEGIN
  UPDATE public.behavior_card_progress
  SET
    total_count = GREATEST(0, total_count - p_decrement_value),
    last_incremented_at = now(),
    updated_at = now()
  WHERE card_id = p_card_id AND student_id = p_student_id
  RETURNING total_count INTO v_new_count;

  IF v_new_count IS NULL THEN
    RETURN 0;
  END IF;

  INSERT INTO public.behavior_card_increments (card_id, student_id, increment_value, incremented_by)
  VALUES (p_card_id, p_student_id, -p_decrement_value, auth.uid());

  RETURN v_new_count;
END;
$$;

CREATE OR REPLACE FUNCTION public.reorder_severity_levels(level_updates jsonb)
  RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  item jsonb;
  temp_offset integer := 1000;
BEGIN
  FOR item IN SELECT * FROM jsonb_array_elements(level_updates)
  LOOP
    UPDATE public.behavior_severity_levels
    SET level = -temp_offset - (item->>'level')::integer
    WHERE id = (item->>'id')::uuid;
  END LOOP;

  FOR item IN SELECT * FROM jsonb_array_elements(level_updates)
  LOOP
    UPDATE public.behavior_severity_levels
    SET level = (item->>'level')::integer
    WHERE id = (item->>'id')::uuid;
  END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION public.reorder_severity_levels(p_school_id uuid, p_reorder_data jsonb)
  RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  item jsonb;
BEGIN
  FOR item IN SELECT * FROM jsonb_array_elements(p_reorder_data)
  LOOP
    UPDATE public.behavior_severity_levels
    SET level = NULL
    WHERE id = (item->>'id')::uuid
      AND school_id = p_school_id;
  END LOOP;

  FOR item IN SELECT * FROM jsonb_array_elements(p_reorder_data)
  LOOP
    UPDATE public.behavior_severity_levels
    SET level = (item->>'level')::integer
    WHERE id = (item->>'id')::uuid
      AND school_id = p_school_id;
  END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION public.join_school_by_code(school_code_input text)
  RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
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

  RETURN json_build_object('success', true, 'message', 'Succesvol toegevoegd aan ' || school_record.name || '!');
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', 'Er is een onverwachte fout opgetreden. Probeer het later opnieuw.');
END;
$$;

CREATE OR REPLACE FUNCTION public.log_student_tag_change()
  RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_tag_name text;
  v_tag_color text;
  v_student_id uuid;
  v_tag_definition_id uuid;
  v_performed_by uuid;
  v_action text;
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_student_id := NEW.student_id;
    v_tag_definition_id := NEW.tag_definition_id;
    v_performed_by := NEW.assigned_by;
    v_action := 'added';
  ELSE
    v_student_id := OLD.student_id;
    v_tag_definition_id := OLD.tag_definition_id;
    v_performed_by := OLD.assigned_by;
    v_action := 'removed';
  END IF;

  SELECT name, color INTO v_tag_name, v_tag_color
  FROM public.student_tag_definitions
  WHERE id = v_tag_definition_id;

  INSERT INTO public.student_tag_log (
    student_id, tag_definition_id, tag_name, tag_color, action, performed_by, performed_at
  ) VALUES (
    v_student_id, v_tag_definition_id,
    COALESCE(v_tag_name, 'Onbekende tag'), COALESCE(v_tag_color, '#6B7280'),
    v_action, v_performed_by, now()
  );

  IF TG_OP = 'INSERT' THEN RETURN NEW; ELSE RETURN OLD; END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.link_child_shares_on_email_match()
  RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  UPDATE public.child_shares
  SET
    shared_with_user_id = NEW.id,
    status = 'pending',
    updated_at = now()
  WHERE shared_with_email = NEW.email
    AND shared_with_user_id IS NULL;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
  RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.user_profiles (user_id, display_name, is_admin)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', 'User'),
    false
  )
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'handle_new_user failed for user %: % - %', NEW.id, SQLSTATE, SQLERRM;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_books_by_popularity(p_school_id uuid, p_letter text DEFAULT NULL::text, p_avail_filter text DEFAULT 'all'::text)
  RETURNS TABLE(id uuid, isbn text, title text, author text, cover_image_url text, custom_cover_url text, page_count integer, total_copies integer, available_copies integer, metadata_source text, location_id uuid, created_at timestamp with time zone, loan_count bigint)
  LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$
  SELECT
    b.id, b.isbn, b.title, b.author,
    b.cover_image_url, b.custom_cover_url,
    b.page_count, b.total_copies, b.available_copies,
    b.metadata_source, b.location_id, b.created_at,
    COUNT(sb.id) AS loan_count
  FROM public.books b
  LEFT JOIN public.student_books sb ON sb.book_id = b.id
  WHERE b.school_id = p_school_id
    AND (
      p_letter IS NULL
      OR (p_letter = '#' AND b.title !~* '^[A-Z]')
      OR (p_letter != '#' AND b.title ILIKE (p_letter || '%'))
    )
    AND (
      p_avail_filter = 'available' AND b.available_copies > 0
      OR p_avail_filter = 'unavailable' AND b.available_copies = 0
      OR p_avail_filter NOT IN ('available', 'unavailable')
    )
  GROUP BY b.id
  ORDER BY loan_count DESC, b.title ASC;
$$;

CREATE OR REPLACE FUNCTION public.get_books_by_recent_activity(p_school_id uuid, p_letter text DEFAULT NULL::text, p_avail_filter text DEFAULT 'all'::text)
  RETURNS TABLE(id uuid, isbn text, title text, author text, cover_image_url text, custom_cover_url text, page_count integer, total_copies integer, available_copies integer, metadata_source text, location_id uuid, created_at timestamp with time zone, last_borrowed_at timestamp with time zone)
  LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$
  SELECT
    b.id, b.isbn, b.title, b.author,
    b.cover_image_url, b.custom_cover_url,
    b.page_count, b.total_copies, b.available_copies,
    b.metadata_source, b.location_id, b.created_at,
    MAX(sb.borrowed_at) AS last_borrowed_at
  FROM public.books b
  LEFT JOIN public.student_books sb ON sb.book_id = b.id
  WHERE b.school_id = p_school_id
    AND (
      p_letter IS NULL
      OR (p_letter = '#' AND b.title !~* '^[A-Z]')
      OR (p_letter != '#' AND b.title ILIKE (p_letter || '%'))
    )
    AND (
      p_avail_filter = 'available' AND b.available_copies > 0
      OR p_avail_filter = 'unavailable' AND b.available_copies = 0
      OR p_avail_filter NOT IN ('available', 'unavailable')
    )
  GROUP BY b.id
  ORDER BY last_borrowed_at DESC NULLS LAST, b.title ASC;
$$;

CREATE OR REPLACE FUNCTION public.get_word_student_streak(p_student_id uuid)
  RETURNS integer LANGUAGE plpgsql SET search_path = ''
AS $$
DECLARE
  v_streak INTEGER := 0;
  v_current_date DATE;
  v_practice_date DATE;
  v_dates DATE[];
BEGIN
  SELECT ARRAY_AGG(DISTINCT DATE(created_at) ORDER BY DATE(created_at) DESC)
  INTO v_dates
  FROM public.word_exercise_attempts
  WHERE student_id = p_student_id
    AND created_at > NOW() - INTERVAL '31 days';

  IF v_dates IS NULL OR array_length(v_dates, 1) IS NULL THEN
    RETURN 0;
  END IF;

  v_current_date := CURRENT_DATE;

  IF v_dates[1] NOT IN (v_current_date, v_current_date - 1) THEN
    RETURN 0;
  END IF;

  v_streak := 1;
  v_practice_date := v_dates[1];

  FOR i IN 2..array_length(v_dates, 1) LOOP
    IF v_dates[i] = v_practice_date - 1 THEN
      v_streak := v_streak + 1;
      v_practice_date := v_dates[i];
    ELSE
      EXIT;
    END IF;
  END LOOP;

  RETURN v_streak;
END;
$$;
