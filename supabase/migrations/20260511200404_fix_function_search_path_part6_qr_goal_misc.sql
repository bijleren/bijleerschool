/*
  # Fix mutable search_path on QR storage, goal progress, and misc functions
*/

CREATE OR REPLACE FUNCTION public.calculate_qr_storage_bytes(p_qr_code_id uuid)
  RETURNS bigint LANGUAGE plpgsql SET search_path = ''
AS $$
DECLARE
  v_total_bytes bigint;
BEGIN
  SELECT COALESCE(SUM(
    CASE
      WHEN content_type IN ('photo', 'video', 'audio', 'document') THEN
        COALESCE((content->>'size')::bigint, 0)
      ELSE 0
    END
  ), 0)
  INTO v_total_bytes
  FROM public.qr_content_items
  WHERE qr_content_items.qr_code_id = p_qr_code_id;
  RETURN v_total_bytes;
END;
$$;

CREATE OR REPLACE FUNCTION public.trigger_update_qr_storage()
  RETURNS trigger LANGUAGE plpgsql SET search_path = ''
AS $$
DECLARE
  qr_school_id uuid;
BEGIN
  UPDATE public.qr_codes
  SET storage_bytes = public.calculate_qr_storage_bytes(COALESCE(NEW.qr_code_id, OLD.qr_code_id))
  WHERE id = COALESCE(NEW.qr_code_id, OLD.qr_code_id);

  SELECT school_id INTO qr_school_id
  FROM public.qr_codes
  WHERE id = COALESCE(NEW.qr_code_id, OLD.qr_code_id);

  IF qr_school_id IS NOT NULL THEN
    PERFORM public.update_school_storage(qr_school_id);
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE OR REPLACE FUNCTION public.trigger_update_school_storage_on_qr_change()
  RETURNS trigger LANGUAGE plpgsql SET search_path = ''
AS $$
BEGIN
  IF OLD.school_id IS DISTINCT FROM NEW.school_id THEN
    IF OLD.school_id IS NOT NULL THEN
      PERFORM public.update_school_storage(OLD.school_id);
    END IF;
    IF NEW.school_id IS NOT NULL THEN
      PERFORM public.update_school_storage(NEW.school_id);
    END IF;
  ELSIF OLD.storage_bytes IS DISTINCT FROM NEW.storage_bytes AND NEW.school_id IS NOT NULL THEN
    PERFORM public.update_school_storage(NEW.school_id);
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.increment_qr_views(qr_id uuid)
  RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  UPDATE public.qr_codes
  SET views = views + 1
  WHERE id = qr_id;

  INSERT INTO public.qr_views (qr_code_id, user_id)
  VALUES (qr_id, auth.uid());
END;
$$;

CREATE OR REPLACE FUNCTION public.user_has_paper_qr_codes(folder_owner_id uuid)
  RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.qr_codes
    WHERE user_id = folder_owner_id
      AND is_paper = true
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.user_is_school_member_for_folder(folder_owner_id uuid)
  RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.qr_codes qr
    JOIN public.school_teammembers stm ON stm.school_id = qr.school_id
    WHERE qr.user_id = folder_owner_id
      AND qr.school_id IS NOT NULL
      AND stm.user_id = auth.uid()
      AND stm.is_active = true
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.goal_sort_order(code_text text)
  RETURNS integer LANGUAGE plpgsql IMMUTABLE SET search_path = ''
AS $$
DECLARE
  parts text[];
  major int;
  minor int;
  patch int;
BEGIN
  parts := string_to_array(code_text, '.');
  major := COALESCE(parts[1]::int, 0);
  minor := COALESCE(parts[2]::int, 0);
  patch := COALESCE(parts[3]::int, 0);
  RETURN (major * 10000) + (minor * 100) + patch;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_goal_progress_from_material_session()
  RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  current_goal_code text;
  material_goals text[];
  material_title text;
BEGIN
  SELECT title INTO material_title
  FROM public.educational_materials
  WHERE id = NEW.material_id;

  SELECT ARRAY_AGG(goal_code) INTO material_goals
  FROM public.educational_material_goals
  WHERE material_id = NEW.material_id;

  IF material_goals IS NULL OR array_length(material_goals, 1) IS NULL THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.goal_tracking_sessions (
    group_id, goal_codes, activity_type, activity_name,
    practiced_at, notes, created_by, created_at
  ) VALUES (
    NEW.group_id, material_goals, 'material', material_title,
    NEW.created_at, NEW.notes, NEW.created_by, NEW.created_at
  );

  FOREACH current_goal_code IN ARRAY material_goals
  LOOP
    INSERT INTO public.group_goal_progress (
      group_id, goal_code, total_sessions, total_repetitions,
      last_practiced_at, first_practiced_at, updated_at
    ) VALUES (
      NEW.group_id, current_goal_code, 1, 1,
      NEW.created_at, NEW.created_at, now()
    )
    ON CONFLICT (group_id, goal_code)
    DO UPDATE SET
      total_sessions = public.group_goal_progress.total_sessions + 1,
      total_repetitions = public.group_goal_progress.total_repetitions + 1,
      last_practiced_at = NEW.created_at,
      updated_at = now();
  END LOOP;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_goal_progress_from_video_session()
  RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  current_goal_code text;
  video_goals text[];
  video_title text;
BEGIN
  SELECT title INTO video_title
  FROM public.educational_videos
  WHERE id = NEW.video_id;

  SELECT ARRAY_AGG(goal_code) INTO video_goals
  FROM public.educational_video_goals
  WHERE video_id = NEW.video_id;

  IF video_goals IS NULL OR array_length(video_goals, 1) IS NULL THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.goal_tracking_sessions (
    group_id, goal_codes, activity_type, activity_name,
    practiced_at, notes, created_by, created_at
  ) VALUES (
    NEW.group_id, video_goals, 'video', video_title,
    NEW.created_at, NEW.notes, NEW.created_by, NEW.created_at
  );

  FOREACH current_goal_code IN ARRAY video_goals
  LOOP
    INSERT INTO public.group_goal_progress (
      group_id, goal_code, total_sessions, total_repetitions,
      last_practiced_at, first_practiced_at, updated_at
    ) VALUES (
      NEW.group_id, current_goal_code, 1, 1,
      NEW.created_at, NEW.created_at, now()
    )
    ON CONFLICT (group_id, goal_code)
    DO UPDATE SET
      total_sessions = public.group_goal_progress.total_sessions + 1,
      total_repetitions = public.group_goal_progress.total_repetitions + 1,
      last_practiced_at = NEW.created_at,
      updated_at = now();
  END LOOP;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_group_goal_progress()
  RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  current_goal_code text;
  unique_goal_codes text[];
BEGIN
  SELECT ARRAY(SELECT DISTINCT unnest(NEW.goal_codes)) INTO unique_goal_codes;

  FOREACH current_goal_code IN ARRAY unique_goal_codes
  LOOP
    INSERT INTO public.group_goal_progress (
      group_id, goal_code, total_sessions, total_repetitions,
      last_practiced_at, first_practiced_at, updated_at
    ) VALUES (
      NEW.group_id, current_goal_code, 1, NEW.repetitions,
      NEW.practiced_at, NEW.practiced_at, now()
    )
    ON CONFLICT (group_id, goal_code)
    DO UPDATE SET
      total_sessions = public.group_goal_progress.total_sessions + 1,
      total_repetitions = public.group_goal_progress.total_repetitions + NEW.repetitions,
      last_practiced_at = NEW.practiced_at,
      updated_at = now();
  END LOOP;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.auto_activate_scheduled_hoekenwerk()
  RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  schedule_row RECORD;
  new_board_id uuid;
  item_row RECORD;
  board_start timestamptz;
  board_end timestamptz;
  current_dow integer;
  group_school_id uuid;
BEGIN
  current_dow := EXTRACT(DOW FROM now());

  FOR schedule_row IN
    SELECT hs.*, ht.name AS template_name, ht.school_id AS template_school_id
    FROM public.hoekenwerk_schedules hs
    JOIN public.hoekenwerk_templates ht ON ht.id = hs.template_id
    WHERE hs.is_active = true
      AND hs.start_date <= CURRENT_DATE
      AND (hs.end_date IS NULL OR hs.end_date >= CURRENT_DATE)
      AND current_dow = ANY(hs.day_of_week)
  LOOP
    board_start := (CURRENT_DATE + schedule_row.start_time)::timestamptz;
    board_end := board_start + (schedule_row.duration_minutes || ' minutes')::interval;

    IF now() < board_start OR now() > board_end THEN CONTINUE; END IF;

    IF EXISTS (
      SELECT 1 FROM public.activity_boards
      WHERE template_id = schedule_row.template_id
        AND group_id = schedule_row.group_id
        AND activated_at >= CURRENT_DATE::timestamptz
        AND activated_at < (CURRENT_DATE + interval '1 day')::timestamptz
    ) THEN CONTINUE; END IF;

    SELECT g.school_id INTO group_school_id
    FROM public.groups g WHERE g.id = schedule_row.group_id;

    INSERT INTO public.activity_boards (
      school_id, name, description, is_active, created_by,
      group_id, template_id, activated_at, active_until, activated_by
    ) VALUES (
      COALESCE(group_school_id, schedule_row.template_school_id),
      schedule_row.template_name || ' - ' || to_char(now(), 'DD Mon'),
      'Automatisch gestart vanuit rooster',
      true, schedule_row.created_by, schedule_row.group_id,
      schedule_row.template_id, board_start, board_end, schedule_row.created_by
    ) RETURNING id INTO new_board_id;

    FOR item_row IN
      SELECT hti.*, ap.name AS preset_name, ap.description AS preset_description,
             ap.icon AS preset_icon, ap.color AS preset_color, ap.max_students AS preset_max_students
      FROM public.hoekenwerk_template_items hti
      JOIN public.activity_presets ap ON ap.id = hti.activity_preset_id
      WHERE hti.template_id = schedule_row.template_id
      ORDER BY hti.sort_order
    LOOP
      INSERT INTO public.activity_options (
        board_id, name, description, max_students, color, icon, sort_order, is_active
      ) VALUES (
        new_board_id, item_row.preset_name, item_row.preset_description,
        COALESCE(item_row.max_students_override, item_row.preset_max_students),
        item_row.preset_color, item_row.preset_icon, item_row.sort_order, true
      );
    END LOOP;
  END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION public.auto_expire_hoekenwerk_boards()
  RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  UPDATE public.activity_sessions
  SET end_time = ab.active_until
  FROM public.activity_boards ab
  WHERE public.activity_sessions.board_id = ab.id
    AND ab.active_until IS NOT NULL
    AND ab.active_until < now()
    AND ab.archived_at IS NULL
    AND public.activity_sessions.end_time IS NULL;

  UPDATE public.activity_boards
  SET archived_at = now()
  WHERE active_until IS NOT NULL
    AND active_until < now()
    AND archived_at IS NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.generate_school_code()
  RETURNS text LANGUAGE plpgsql SET search_path = ''
AS $$
DECLARE
  code text;
  code_exists boolean;
BEGIN
  LOOP
    code := upper(substring(md5(random()::text) from 1 for 6));
    SELECT EXISTS(SELECT 1 FROM public.schools WHERE school_code = code) INTO code_exists;
    IF NOT code_exists THEN RETURN code; END IF;
  END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION public.generate_invite_code()
  RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  code text;
  exists_check boolean;
BEGIN
  LOOP
    code := upper(substring(md5(random()::text) from 1 for 8));
    SELECT EXISTS(SELECT 1 FROM public.user_invites WHERE invite_code = code) INTO exists_check;
    EXIT WHEN NOT exists_check;
  END LOOP;
  RETURN code;
END;
$$;

CREATE OR REPLACE FUNCTION public.generate_credit_code(credit_amount integer)
  RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  code_suffix text;
  full_code text;
  code_exists boolean;
BEGIN
  IF credit_amount <= 0 THEN
    RAISE EXCEPTION 'Credit amount must be positive';
  END IF;
  LOOP
    code_suffix := '';
    FOR i IN 1..6 LOOP
      code_suffix := code_suffix || substr('ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789', floor(random() * 36 + 1)::int, 1);
    END LOOP;
    full_code := credit_amount::text || '-' || code_suffix;
    SELECT EXISTS(SELECT 1 FROM public.credit_codes WHERE code = full_code) INTO code_exists;
    EXIT WHEN NOT code_exists;
  END LOOP;
  INSERT INTO public.credit_codes (code, amount) VALUES (full_code, credit_amount);
  RETURN full_code;
END;
$$;

CREATE OR REPLACE FUNCTION public.generate_voucher_code()
  RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_code text;
  v_exists boolean;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.admin_users
    JOIN public.profiles ON public.profiles.email = public.admin_users.email
    WHERE public.profiles.id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Unauthorized: Admin access required';
  END IF;
  LOOP
    v_code := 'WS-' ||
      TO_CHAR(now(), 'YYYY') || '-' ||
      UPPER(SUBSTRING(MD5(RANDOM()::text) FROM 1 FOR 4)) || '-' ||
      UPPER(SUBSTRING(MD5(RANDOM()::text) FROM 1 FOR 4));
    SELECT EXISTS(SELECT 1 FROM public.voucher_codes WHERE code = v_code) INTO v_exists;
    EXIT WHEN NOT v_exists;
  END LOOP;
  RETURN v_code;
END;
$$;

CREATE OR REPLACE FUNCTION public.generate_organization_code(
  p_organization_id uuid,
  p_expires_at timestamp with time zone DEFAULT NULL,
  p_max_uses integer DEFAULT NULL,
  p_role_to_assign text DEFAULT 'teacher'
)
  RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  new_code text;
  code_record RECORD;
  is_admin boolean := false;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM public.school_users
    WHERE school_id = p_organization_id AND user_id = auth.uid() AND role = 'admin'
  ) OR EXISTS (
    SELECT 1 FROM public.schools
    WHERE id = p_organization_id AND owner_user_id = auth.uid()
  ) INTO is_admin;

  IF NOT is_admin THEN
    RETURN jsonb_build_object('success', false, 'error', 'Permission denied');
  END IF;

  LOOP
    new_code := upper(substring(md5(random()::text || clock_timestamp()::text) from 1 for 8));
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.organization_codes WHERE code = new_code);
  END LOOP;

  INSERT INTO public.organization_codes (
    organization_id, code, created_by, is_active,
    expires_at, max_uses, role_to_assign, created_at
  ) VALUES (
    p_organization_id, new_code, auth.uid(), true,
    p_expires_at, p_max_uses, p_role_to_assign, now()
  ) RETURNING * INTO code_record;

  RETURN jsonb_build_object(
    'success', true,
    'code', code_record.code,
    'expires_at', code_record.expires_at,
    'max_uses', code_record.max_uses
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.validate_content()
  RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  CASE NEW.content_type
    WHEN 'text' THEN
      IF NOT (NEW.content ? 'text') THEN RAISE EXCEPTION 'Text content must include "text" field'; END IF;
    WHEN 'website' THEN
      IF NOT (NEW.content ? 'url') THEN RAISE EXCEPTION 'Website content must include "url" field'; END IF;
    WHEN 'location' THEN
      IF NOT (NEW.content ? 'latitude' AND NEW.content ? 'longitude') THEN
        RAISE EXCEPTION 'Location content must include "latitude" and "longitude" fields';
      END IF;
    WHEN 'photo' THEN
      IF NOT (NEW.content ? 'url') THEN RAISE EXCEPTION 'Photo content must include "url" field'; END IF;
    WHEN 'video' THEN
      IF NOT (NEW.content ? 'url') THEN RAISE EXCEPTION 'Video content must include "url" field'; END IF;
    WHEN 'audio' THEN
      IF NOT (NEW.content ? 'url') THEN RAISE EXCEPTION 'Audio content must include "url" field'; END IF;
    WHEN 'document' THEN
      IF NOT (NEW.content ? 'url') THEN RAISE EXCEPTION 'Document content must include "url" field'; END IF;
  END CASE;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.validate_qr_content()
  RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  CASE NEW.content_type
    WHEN 'text' THEN
      IF NOT (NEW.content ? 'text') THEN RAISE EXCEPTION 'Text content must include "text" field'; END IF;
    WHEN 'website' THEN
      IF NOT (NEW.content ? 'url') THEN RAISE EXCEPTION 'Website content must include "url" field'; END IF;
    WHEN 'photo' THEN
      IF NOT (NEW.content ? 'url') THEN RAISE EXCEPTION 'Photo content must include "url" field'; END IF;
    WHEN 'video' THEN
      IF NOT (NEW.content ? 'url') THEN RAISE EXCEPTION 'Video content must include "url" field'; END IF;
    WHEN 'audio' THEN
      IF NOT (NEW.content ? 'url') THEN RAISE EXCEPTION 'Audio content must include "url" field'; END IF;
    WHEN 'document' THEN
      IF NOT (NEW.content ? 'url') THEN RAISE EXCEPTION 'Document content must include "url" field'; END IF;
    WHEN 'location' THEN
      IF NOT (NEW.content ? 'address') THEN RAISE EXCEPTION 'Location content must include "address" field'; END IF;
    WHEN 'todo' THEN
      IF NOT (NEW.content ? 'title' AND NEW.content ? 'items') THEN
        RAISE EXCEPTION 'Todo content must include "title" and "items" fields';
      END IF;
  END CASE;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.validate_credits()
  RETURNS trigger LANGUAGE plpgsql SET search_path = ''
AS $$
DECLARE
  v_owner_id uuid;
  v_sheet_owner_id uuid;
  v_billing_user_id uuid;
  v_credits_needed integer;
  v_current_credits integer;
  v_content_size_mb numeric;
  v_user_credit_rate numeric;
  v_qr_is_paper boolean;
BEGIN
  IF NEW.content_type NOT IN ('photo', 'video', 'audio', 'document') THEN RETURN NEW; END IF;

  SELECT qr.user_id, qr.is_paper INTO v_owner_id, v_qr_is_paper
  FROM public.qr_codes qr WHERE qr.id = NEW.qr_code_id;

  IF v_qr_is_paper THEN
    SELECT uss.user_id INTO v_sheet_owner_id
    FROM public.user_sticker_sheets uss
    JOIN public.sticker_order_items soi ON soi.order_id::text = uss.sheet_id
    WHERE soi.qr_code_id = NEW.qr_code_id LIMIT 1;
    v_billing_user_id := COALESCE(v_sheet_owner_id, v_owner_id);
  ELSE
    v_billing_user_id := v_owner_id;
  END IF;

  IF v_billing_user_id IS NULL THEN RETURN NEW; END IF;

  SELECT up.credit_rate INTO v_user_credit_rate
  FROM public.user_profiles up WHERE up.user_id = v_billing_user_id;

  IF v_user_credit_rate IS NULL THEN v_user_credit_rate := 1.0; END IF;

  CASE NEW.content_type
    WHEN 'photo' THEN v_content_size_mb := 2.0;
    WHEN 'video' THEN v_content_size_mb := 10.0;
    WHEN 'audio' THEN v_content_size_mb := 3.0;
    WHEN 'document' THEN v_content_size_mb := 1.0;
    ELSE v_content_size_mb := 0.0;
  END CASE;

  v_credits_needed := CEIL(v_content_size_mb * v_user_credit_rate);
  IF v_credits_needed <= 0 THEN RETURN NEW; END IF;

  SELECT up.credits INTO v_current_credits
  FROM public.user_profiles up WHERE up.user_id = v_billing_user_id;

  IF v_current_credits < v_credits_needed THEN
    RAISE EXCEPTION 'Insufficient credits. Required: %, Available: %', v_credits_needed, v_current_credits;
  END IF;

  RETURN NEW;
END;
$$;
