/*
  # Fix SECURITY DEFINER view: word_student_progress_summary

  Recreate the view as SECURITY INVOKER (the default) so it runs under the
  calling user's permissions and respects their RLS policies, rather than
  bypassing RLS by running as the view owner.
*/

DROP VIEW IF EXISTS public.word_student_progress_summary;

CREATE VIEW public.word_student_progress_summary
  WITH (security_invoker = true)
AS
  SELECT
    s.id AS student_id,
    s.first_name,
    s.last_name,
    s.school_id,
    count(DISTINCT wea.id) AS total_attempts,
    count(DISTINCT CASE WHEN wea.is_correct THEN wea.id ELSE NULL::uuid END) AS correct_attempts,
    round(
      count(DISTINCT CASE WHEN wea.is_correct THEN wea.id ELSE NULL::uuid END)::numeric
      / NULLIF(count(DISTINCT wea.id), 0)::numeric * 100::numeric,
      1
    ) AS accuracy_percentage,
    count(DISTINCT date(wea.created_at)) AS practice_days,
    count(DISTINCT wea.word) AS unique_words_practiced,
    max(wea.created_at) AS last_practice_at
  FROM public.students s
  LEFT JOIN public.word_exercise_attempts wea ON s.id = wea.student_id
  WHERE s.is_active = true
  GROUP BY s.id, s.first_name, s.last_name, s.school_id;
