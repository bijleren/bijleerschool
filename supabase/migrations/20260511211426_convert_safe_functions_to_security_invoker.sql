/*
  # Convert eligible SECURITY DEFINER functions to SECURITY INVOKER

  ## Summary
  Reduces SECURITY DEFINER surface area by converting functions that do not
  need elevated privileges. A function can be SECURITY INVOKER when:
    - It only reads/writes tables the caller already has RLS access to, AND
    - It does not need to read admin/super_admin tables that are restricted, AND
    - It is not used inside an RLS policy WITH CHECK (would cause recursion)

  ## Functions converted to SECURITY INVOKER

  1. bump_daily_progress — daily_progress has INSERT/UPDATE policies for any auth.uid()
  2. get_klankgroepen_words_by_length — wordfrequency has public SELECT policy
  3. reorder_severity_levels (both overloads) — behavior_severity_levels has school-member ALL policy
  4. get_storage_breakdown — storage_usage_log has school-member SELECT policy
  5. get_books_by_popularity — books + student_books have school-member ALL policy
  6. get_books_by_recent_activity — books + student_books have school-member ALL policy
  7. is_board_expired — activity_boards accessible by authenticated users
  8. is_school_member — reads user_schools using caller auth.uid(); no privilege bypass
  9. is_school_admin(check_school_id) — reads school_teammembers using caller auth.uid()
  10. user_has_paper_qr_codes — reads qr_codes accessible to school members
  11. user_is_school_member_for_folder — reads qr_codes + school_teammembers via RLS
  12. increment_behavior_card — behavior_card_progress/increments have school-member ALL policy
  13. decrement_behavior_card — behavior_card_progress/increments have school-member ALL policy
  14. check_license_access — organization_licenses has school-member SELECT policy

  ## Functions intentionally kept as SECURITY DEFINER

  - is_admin / is_current_user_admin — admin_users RLS policy calls is_current_user_admin()
    so converting would cause infinite recursion
  - is_super_admin / is_school_admin(user_id, school_id) — cross-user privilege checks
  - increment_qr_views / lookup_student_by_access_hash — anon access / view counter bypass
  - join_school_by_code / join_organization_with_code — INSERT into school_teammembers
    (RLS only allows managing own row, not inserting for others)
  - claim_student_with_code / claim_child_with_code — multi-table privileged inserts
  - connect_sticker_sheet / create_sticker_order — restricted table writes
  - redeem_credit_code / redeem_voucher_code / extend_license_from_purchase / cancel_license
  - process_invite_signup / process_invite_purchase — trigger functions
  - generate_invite_code / generate_student_code — reads restricted code tables
  - can_insert_content_* — used in RLS WITH CHECK policies (recursion if INVOKER)
  - lookup_coupon_by_code — coupon_codes has no public SELECT
  - get_organization_licenses — requires admin check across all orgs
  - disconnect_from_shared_student — DELETE from restricted tables
  - update_school_storage_usage — writes schools table (no UPDATE policy for users)
*/

-- 1. bump_daily_progress
CREATE OR REPLACE FUNCTION public.bump_daily_progress(
  p_phonemes integer DEFAULT 0,
  p_words integer DEFAULT 0,
  p_text_chars integer DEFAULT 0,
  p_day date DEFAULT NULL::date
)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $function$
DECLARE
    v_day DATE;
BEGIN
    IF p_phonemes   < 0 THEN p_phonemes   := 0; END IF;
    IF p_words      < 0 THEN p_words      := 0; END IF;
    IF p_text_chars < 0 THEN p_text_chars := 0; END IF;

    IF p_phonemes = 0 AND p_words = 0 AND p_text_chars = 0 THEN
        RETURN;
    END IF;

    v_day := COALESCE(p_day, (now() AT TIME ZONE 'Europe/Brussels')::date);

    INSERT INTO public.daily_progress (day, phonemes_done, words_done, text_chars_read)
    VALUES (v_day, p_phonemes, p_words, p_text_chars)
    ON CONFLICT (day) DO UPDATE SET
        phonemes_done   = public.daily_progress.phonemes_done   + EXCLUDED.phonemes_done,
        words_done      = public.daily_progress.words_done      + EXCLUDED.words_done,
        text_chars_read = public.daily_progress.text_chars_read + EXCLUDED.text_chars_read,
        updated_at      = now();
END;
$function$;

-- 2. get_klankgroepen_words_by_length
CREATE OR REPLACE FUNCTION public.get_klankgroepen_words_by_length(
  p_sort_ascending boolean DEFAULT true,
  p_offset integer DEFAULT 0,
  p_limit integer DEFAULT 100
)
RETURNS TABLE(id integer, word character varying, klankteken character varying, klankgroepenklanken character varying)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $function$
BEGIN
RETURN QUERY
SELECT
w.id,
w.word,
w.klankteken,
w.klankgroepenklanken
FROM public.wordfrequency w
WHERE w.klankteken_checked = 1
AND w.klankgroup_checked = 0
AND w.language = 'nl'
ORDER BY
CASE
WHEN p_sort_ascending THEN LENGTH(w.word)
ELSE -LENGTH(w.word)
END,
w.word
OFFSET p_offset
LIMIT p_limit;
END;
$function$;

-- 3. reorder_severity_levels (overload 1: level_updates jsonb)
CREATE OR REPLACE FUNCTION public.reorder_severity_levels(level_updates jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $function$
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
$function$;

-- 4. reorder_severity_levels (overload 2: p_school_id, p_reorder_data)
CREATE OR REPLACE FUNCTION public.reorder_severity_levels(p_school_id uuid, p_reorder_data jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $function$
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
$function$;

-- 5. get_storage_breakdown
CREATE OR REPLACE FUNCTION public.get_storage_breakdown(p_school_id uuid)
RETURNS TABLE(file_type text, total_size_bytes bigint, file_count bigint)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $function$
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
$function$;

-- 6. get_books_by_popularity
CREATE OR REPLACE FUNCTION public.get_books_by_popularity(
  p_school_id uuid,
  p_letter text DEFAULT NULL::text,
  p_avail_filter text DEFAULT 'all'::text
)
RETURNS TABLE(id uuid, isbn text, title text, author text, cover_image_url text, custom_cover_url text, page_count integer, total_copies integer, available_copies integer, metadata_source text, location_id uuid, created_at timestamp with time zone, loan_count bigint)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = ''
AS $function$
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
$function$;

-- 7. get_books_by_recent_activity
CREATE OR REPLACE FUNCTION public.get_books_by_recent_activity(
  p_school_id uuid,
  p_letter text DEFAULT NULL::text,
  p_avail_filter text DEFAULT 'all'::text
)
RETURNS TABLE(id uuid, isbn text, title text, author text, cover_image_url text, custom_cover_url text, page_count integer, total_copies integer, available_copies integer, metadata_source text, location_id uuid, created_at timestamp with time zone, last_borrowed_at timestamp with time zone)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = ''
AS $function$
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
$function$;

-- 8. is_board_expired
CREATE OR REPLACE FUNCTION public.is_board_expired(board_id_param uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $function$
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
$function$;

-- 9. is_school_member
CREATE OR REPLACE FUNCTION public.is_school_member(target_school_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = ''
AS $function$
SELECT EXISTS (
SELECT 1
FROM public.user_schools
WHERE user_id = auth.uid()
AND school_id = target_school_id
AND status = 'approved'
AND is_active = true
);
$function$;

-- 10. is_school_admin (single-arg overload using auth.uid())
CREATE OR REPLACE FUNCTION public.is_school_admin(check_school_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = ''
AS $function$
SELECT EXISTS (
SELECT 1
FROM public.school_teammembers
WHERE school_id = check_school_id
AND user_id = auth.uid()
AND role = 'admin'
AND is_active = true
);
$function$;

-- 11. user_has_paper_qr_codes
CREATE OR REPLACE FUNCTION public.user_has_paper_qr_codes(folder_owner_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $function$
BEGIN
RETURN EXISTS (
SELECT 1
FROM public.qr_codes
WHERE user_id = folder_owner_id
AND is_paper = true
);
END;
$function$;

-- 12. user_is_school_member_for_folder
CREATE OR REPLACE FUNCTION public.user_is_school_member_for_folder(folder_owner_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $function$
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
$function$;

-- 13. increment_behavior_card
CREATE OR REPLACE FUNCTION public.increment_behavior_card(
  p_card_id uuid,
  p_student_id uuid,
  p_increment_value integer DEFAULT 1
)
RETURNS integer
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $function$
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
$function$;

-- 14. decrement_behavior_card
CREATE OR REPLACE FUNCTION public.decrement_behavior_card(
  p_card_id uuid,
  p_student_id uuid,
  p_decrement_value integer DEFAULT 1
)
RETURNS integer
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $function$
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
$function$;

-- 15. check_license_access
CREATE OR REPLACE FUNCTION public.check_license_access(p_organization_id uuid, p_product_type text)
RETURNS TABLE(has_access boolean, license_type text, status text, valid_until timestamp with time zone, days_remaining integer)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $function$
BEGIN
RETURN QUERY
SELECT 
CASE WHEN ol.status = 'active' AND ol.valid_until > now() THEN true ELSE false END as has_access,
ol.license_type::text,
ol.status::text,
ol.valid_until,
EXTRACT(DAY FROM (ol.valid_until - now()))::integer as days_remaining
FROM public.organization_licenses ol
WHERE ol.organization_id = p_organization_id
AND ol.product_type = p_product_type::public.product_type
AND ol.status = 'active'
ORDER BY ol.valid_until DESC
LIMIT 1;
END;
$function$;
