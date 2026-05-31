/*
  # Fix mutable search_path on storage, board, and school functions
*/

CREATE OR REPLACE FUNCTION public.get_school_total_storage(school_id_param uuid)
  RETURNS bigint LANGUAGE plpgsql SET search_path = ''
AS $$
DECLARE
  total_storage bigint;
BEGIN
  SELECT COALESCE(SUM(storage_bytes), 0)
  INTO total_storage
  FROM public.qr_codes
  WHERE school_id = school_id_param;
  RETURN total_storage;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_school_storage(school_id_param uuid)
  RETURNS void LANGUAGE plpgsql SET search_path = ''
AS $$
DECLARE
  total_storage bigint;
BEGIN
  SELECT COALESCE(SUM(storage_bytes), 0)
  INTO total_storage
  FROM public.qr_codes
  WHERE school_id = school_id_param;

  UPDATE public.schools
  SET storage_used_bytes = total_storage
  WHERE id = school_id_param;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_school_storage_usage(p_school_id uuid)
  RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
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
$$;

CREATE OR REPLACE FUNCTION public.get_storage_breakdown(p_school_id uuid)
  RETURNS TABLE(file_type text, total_size_bytes bigint, file_count bigint)
  LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  RETURN QUERY
  SELECT
    sul.file_type,
    SUM(sul.file_size_bytes)::BIGINT AS total_size_bytes,
    COUNT(*)::BIGINT AS file_count
  FROM public.storage_usage_log sul
  WHERE sul.school_id = p_school_id
    AND sul.deleted_at IS NULL
  GROUP BY sul.file_type
  ORDER BY total_size_bytes DESC;
END;
$$;

CREATE OR REPLACE FUNCTION public.deactivate_expired_boards()
  RETURNS TABLE(board_id uuid, board_name text, sessions_ended integer)
  LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  expired_board RECORD;
  session_count integer;
BEGIN
  FOR expired_board IN
    SELECT id, name
    FROM public.activity_boards
    WHERE is_active = true
      AND active_until IS NOT NULL
      AND active_until <= NOW()
  LOOP
    UPDATE public.activity_sessions
    SET end_time = expired_board.active_until
    WHERE board_id = expired_board.id
      AND end_time IS NULL;

    GET DIAGNOSTICS session_count = ROW_COUNT;

    UPDATE public.activity_boards
    SET is_active = false, updated_at = NOW()
    WHERE id = expired_board.id;

    board_id := expired_board.id;
    board_name := expired_board.name;
    sessions_ended := session_count;
    RETURN NEXT;
  END LOOP;
  RETURN;
END;
$$;

CREATE OR REPLACE FUNCTION public.is_board_expired(board_id_param uuid)
  RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.activity_boards
    WHERE id = board_id_param
      AND is_active = true
      AND active_until IS NOT NULL
      AND active_until <= NOW()
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.sync_premium_school_flag()
  RETURNS trigger LANGUAGE plpgsql SET search_path = ''
AS $$
BEGIN
  IF NEW.product_type = 'woordenschat' AND NEW.status = 'active' THEN
    UPDATE public.schools SET premium_school = 1 WHERE id = NEW.organization_id;
  END IF;
  IF NEW.product_type = 'woordenschat' AND NEW.status IN ('expired', 'cancelled') THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.organization_licenses
      WHERE organization_id = NEW.organization_id
        AND product_type = 'woordenschat'
        AND status = 'active'
        AND id != NEW.id
    ) THEN
      UPDATE public.schools SET premium_school = 0 WHERE id = NEW.organization_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
