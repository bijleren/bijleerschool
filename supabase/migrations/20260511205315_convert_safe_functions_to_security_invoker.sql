/*
  # Convert safe functions to SECURITY INVOKER and restrict coupon lookup

  ## Summary
  This migration reduces the SECURITY DEFINER surface area by:

  1. Converting pure computation/trigger functions to SECURITY INVOKER — they don't need
     elevated privileges because they either do no DB access or only access tables the
     caller already has RLS access to:
     - validate_content (trigger: pure validation, no table reads)
     - validate_qr_content (trigger: pure validation, no table reads)
     - calculate_content_size (pure computation, no DB access at all)

  2. Restricting lookup_coupon_by_code to authenticated users only.
     Anon access to coupon data is not needed in a school platform.

  3. Functions NOT changed (must remain SECURITY DEFINER):
     - All RLS helper functions (is_current_user_admin, is_school_admin, etc.) — they
       bypass RLS to perform cross-user checks used inside policy USING clauses
     - increment_behavior_card / decrement_behavior_card — cross-table privilege bypass
     - join_school_by_code / join_organization_with_code — membership insertion bypass
     - lookup_student_by_access_hash — anon student portal access (WebWijzer)
     - increment_qr_views — anon QR scan counting (required for public QR codes)
     - get_books_by_popularity/recent_activity — complex cross-table queries
     - generate_student_code / generate_invite_code — need to read restricted tables
     - calculate_order_total / get_storage_breakdown — read restricted pricing/storage tables
     - bump_daily_progress — writes to daily_progress which has restrictive RLS
     - update_school_storage_usage — updates school table bypassing RLS
     - user_has_paper_qr_codes / user_is_school_member_for_folder — RLS policy helpers
     - is_board_expired — RLS policy helper
*/

-- ============================================================
-- 1. Convert validate_content to SECURITY INVOKER
--    (trigger function, pure validation logic, no table reads)
-- ============================================================
CREATE OR REPLACE FUNCTION public.validate_content()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $function$
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
$function$;

-- ============================================================
-- 2. Convert validate_qr_content to SECURITY INVOKER
--    (trigger function, pure validation logic, no table reads)
-- ============================================================
CREATE OR REPLACE FUNCTION public.validate_qr_content()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $function$
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
$function$;

-- ============================================================
-- 3. Convert calculate_content_size to SECURITY INVOKER
--    (pure computation — no database access whatsoever)
-- ============================================================
CREATE OR REPLACE FUNCTION public.calculate_content_size(content jsonb, content_type text)
RETURNS bigint
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $function$
DECLARE
  content_size BIGINT := 0;
  url TEXT;
  text_content TEXT;
BEGIN
  CASE content_type
    WHEN 'text' THEN
      text_content := content->>'text';
      content_size := COALESCE(octet_length(text_content), 0);
    WHEN 'website' THEN
      url := content->>'url';
      content_size := COALESCE(octet_length(url), 0);
    WHEN 'location' THEN
      text_content := content->>'address';
      content_size := COALESCE(octet_length(text_content), 0);
    WHEN 'todo' THEN
      content_size := COALESCE(octet_length(content::text), 0);
    WHEN 'photo', 'video', 'audio', 'document' THEN
      url := content->>'url';
      IF url IS NOT NULL THEN
        CASE content_type
          WHEN 'photo' THEN content_size := 1024 * 1024;
          WHEN 'video' THEN content_size := 10 * 1024 * 1024;
          WHEN 'audio' THEN content_size := 5 * 1024 * 1024;
          WHEN 'document' THEN content_size := 2 * 1024 * 1024;
          ELSE content_size := 1024 * 1024;
        END CASE;
      ELSE
        content_size := 0;
      END IF;
    ELSE
      content_size := COALESCE(octet_length(content::text), 0);
  END CASE;
  
  RETURN content_size;
END;
$function$;

-- ============================================================
-- 4. Restrict lookup_coupon_by_code to authenticated only
--    Anon access to coupon data is not required in a school platform.
--    The function remains SECURITY DEFINER (reads coupon_codes table
--    which may have RLS) but anon role loses EXECUTE.
-- ============================================================
REVOKE EXECUTE ON FUNCTION public.lookup_coupon_by_code(text) FROM anon;
