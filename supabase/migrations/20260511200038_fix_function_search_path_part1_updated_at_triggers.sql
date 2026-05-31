/*
  # Fix mutable search_path on updated_at trigger functions

  All simple trigger functions that only set NEW.updated_at = now() are fixed by adding
  SET search_path = '' so they use only the pg_catalog schema implicitly.
  No logic changes — purely a security hardening fix.
*/

CREATE OR REPLACE FUNCTION public.set_updated_at()
  RETURNS trigger LANGUAGE plpgsql SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
  RETURNS trigger LANGUAGE plpgsql SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_routines_updated_at()
  RETURNS trigger LANGUAGE plpgsql SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_reading_techniques_updated_at()
  RETURNS trigger LANGUAGE plpgsql SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_reading_sessions_updated_at()
  RETURNS trigger LANGUAGE plpgsql SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_didactiek_faq_updated_at()
  RETURNS trigger LANGUAGE plpgsql SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_didactiek_vormingen_updated_at()
  RETURNS trigger LANGUAGE plpgsql SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_digitools_updated_at()
  RETURNS trigger LANGUAGE plpgsql SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_zoeker_updated_at()
  RETURNS trigger LANGUAGE plpgsql SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_homework_hints_updated_at()
  RETURNS trigger LANGUAGE plpgsql SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_student_task_stats()
  RETURNS trigger LANGUAGE plpgsql SET search_path = ''
AS $$
BEGIN
  UPDATE public.student_tasks
  SET
    completion_count = (
      SELECT COUNT(*)
      FROM public.task_completions
      WHERE student_task_id = NEW.student_task_id
    ),
    total_stars = (
      SELECT COALESCE(SUM(rating), 0)
      FROM public.task_completions
      WHERE student_task_id = NEW.student_task_id
    ),
    average_rating = (
      SELECT ROUND(AVG(rating)::numeric, 2)
      FROM public.task_completions
      WHERE student_task_id = NEW.student_task_id
    ),
    last_completed_at = NEW.completed_at,
    updated_at = now()
  WHERE id = NEW.student_task_id;
  RETURN NEW;
END;
$$;
