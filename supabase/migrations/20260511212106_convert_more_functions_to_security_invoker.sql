/*
  # Convert more SECURITY DEFINER functions to SECURITY INVOKER

  ## Summary
  Second round of SECURITY DEFINER reductions. Each function was verified against
  the RLS policies of every table it accesses.

  ## Functions converted to SECURITY INVOKER

  1. calculate_order_total
     - Reads sticker_pricing_tiers, sticker_formats, sticker_data_plans
     - All three have "Authenticated can read" SELECT policies with USING (true)

  2. create_sticker_order
     - Reads pricing tables (public read), inserts sticker_orders (user_id = auth.uid() policy)

  3. connect_sticker_sheet
     - Reads/inserts user_sticker_sheets (user_id = auth.uid() policies)
     - Reads qr_codes (school-member policy)

  4. disconnect_from_shared_student
     - Deletes from student_shares and user_student_relations where user_id = auth.uid()
     - Both tables have ALL policies scoped to auth.uid()

  5. is_super_admin
     - Reads super_admins which has USING (true) — publicly readable by authenticated

  6. is_school_admin (2-arg: user_id_input, school_id_input)
     - Reads school_teammembers; school members can SELECT their school's team

  7. lookup_coupon_by_code
     - coupon_codes has "Authenticated can read active coupon_codes" SELECT policy

  ## Functions blocked from authenticated (trigger-only, not callable via RPC)

  8. process_invite_signup — trigger function, not called via RPC
  9. process_invite_purchase — trigger function, not called via RPC

  ## Functions intentionally kept as SECURITY DEFINER

  - is_admin / is_current_user_admin — admin_users RLS policy uses is_current_user_admin() → recursion
  - increment_qr_views / lookup_student_by_access_hash — required for anon student portal
  - join_school_by_code / join_organization_with_code — insert into user_schools (no INSERT policy)
  - claim_student_with_code / claim_child_with_code — insert into user_schools (no INSERT policy)
  - generate_invite_code / generate_student_code — need cross-school uniqueness check
  - redeem_credit_code / redeem_voucher_code — credit_codes/voucher_codes are admin-only
  - extend_license_from_purchase / cancel_license — license tables are admin-only
  - get_organization_licenses — admin-gated function
  - update_school_storage_usage — schools table has no UPDATE policy for users
*/

-- 1. calculate_order_total
CREATE OR REPLACE FUNCTION public.calculate_order_total(
  p_quantity integer,
  p_print_option text,
  p_format_id uuid,
  p_data_plan_id uuid
)
RETURNS numeric
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $function$
DECLARE
  v_base_price DECIMAL;
  v_format_price DECIMAL;
  v_data_plan_price DECIMAL;
  v_shipping_price DECIMAL;
  v_price_per_set DECIMAL;
  v_format_record RECORD;
BEGIN
  SELECT price_per_set INTO v_price_per_set
  FROM public.sticker_pricing_tiers
  WHERE min_quantity <= p_quantity
  AND max_quantity >= p_quantity
  ORDER BY price_per_set DESC
  LIMIT 1;

  v_base_price := v_price_per_set * CEIL(p_quantity::DECIMAL / 70);

  SELECT * INTO v_format_record
  FROM public.sticker_formats
  WHERE id = p_format_id;

  v_format_price := v_format_record.price_per_sheet *
    CEIL(p_quantity::DECIMAL / v_format_record.stickers_per_sheet);

  SELECT price_per_month INTO v_data_plan_price
  FROM public.sticker_data_plans
  WHERE id = p_data_plan_id;

  v_shipping_price := CASE WHEN p_print_option = 'service' THEN 10 ELSE 0 END;

  RETURN v_base_price + v_format_price + v_data_plan_price + v_shipping_price;
END;
$function$;

-- 2. create_sticker_order
CREATE OR REPLACE FUNCTION public.create_sticker_order(
  p_quantity integer,
  p_print_option text,
  p_format_id uuid,
  p_data_plan_id uuid,
  p_shipping_address jsonb DEFAULT NULL::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $function$
DECLARE
  v_total_price DECIMAL;
  v_order_id UUID;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'User must be authenticated to create an order';
  END IF;

  v_total_price := public.calculate_order_total(
    p_quantity,
    p_print_option,
    p_format_id,
    p_data_plan_id
  );

  INSERT INTO public.sticker_orders (
    user_id,
    quantity,
    print_option,
    format_id,
    data_plan_id,
    shipping_address,
    total_price
  ) VALUES (
    auth.uid(),
    p_quantity,
    p_print_option,
    p_format_id,
    p_data_plan_id,
    p_shipping_address,
    v_total_price
  ) RETURNING id INTO v_order_id;

  RETURN v_order_id;
END;
$function$;

-- 3. connect_sticker_sheet
CREATE OR REPLACE FUNCTION public.connect_sticker_sheet(p_sheet_id text, p_user_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $function$
DECLARE
  result json;
  sheet_exists boolean;
  qr_codes_count integer;
BEGIN
  SELECT EXISTS(
    SELECT 1 FROM public.user_sticker_sheets
    WHERE sheet_id = p_sheet_id
  ) INTO sheet_exists;

  IF sheet_exists THEN
    result := json_build_object(
      'success', false,
      'error', 'This sticker sheet is already connected to an account'
    );
    RETURN result;
  END IF;

  SELECT COUNT(*)
  FROM public.qr_codes
  WHERE description ILIKE '%' || p_sheet_id || '%'
  INTO qr_codes_count;

  INSERT INTO public.user_sticker_sheets (
    sheet_id,
    user_id,
    pdf_url,
    qr_count
  ) VALUES (
    p_sheet_id,
    p_user_id,
    'https://placeholder-pdf-url.com/' || p_sheet_id || '.pdf',
    COALESCE(qr_codes_count, 0)
  );

  result := json_build_object(
    'success', true,
    'message', 'Sticker sheet connected successfully',
    'qr_count', COALESCE(qr_codes_count, 0)
  );

  RETURN result;
EXCEPTION
  WHEN OTHERS THEN
    result := json_build_object(
      'success', false,
      'error', SQLERRM
    );
    RETURN result;
END;
$function$;

-- 4. disconnect_from_shared_student
CREATE OR REPLACE FUNCTION public.disconnect_from_shared_student(target_student_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $function$
BEGIN
DELETE FROM public.student_shares
WHERE student_id = target_student_id
AND shared_with_user_id = auth.uid();

DELETE FROM public.user_student_relations
WHERE student_id = target_student_id
AND user_id = auth.uid()
AND is_primary = false;
END;
$function$;

-- 5. is_super_admin
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $function$
BEGIN
RETURN EXISTS (
SELECT 1 FROM public.super_admins
WHERE user_id = auth.uid()
);
END;
$function$;

-- 6. is_school_admin (2-arg overload: arbitrary user_id + school_id)
CREATE OR REPLACE FUNCTION public.is_school_admin(user_id_input uuid, school_id_input uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $function$
BEGIN
RETURN EXISTS (
SELECT 1
FROM public.school_teammembers
WHERE user_id = user_id_input
AND school_id = school_id_input
AND role = 'admin'
AND is_active = true
);
END;
$function$;

-- 7. lookup_coupon_by_code
CREATE OR REPLACE FUNCTION public.lookup_coupon_by_code(p_code text)
RETURNS TABLE(id uuid, code text, is_active boolean, max_uses integer, discount_type text, valid_from timestamp with time zone, valid_until timestamp with time zone)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = ''
AS $function$
  SELECT
    c.id,
    c.code,
    c.is_active,
    c.max_uses,
    c.discount_type,
    c.valid_from,
    c.valid_until
  FROM public.coupon_codes c
  WHERE c.code = p_code
    AND c.is_active = true
    AND (c.valid_from  IS NULL OR c.valid_from  <= now())
    AND (c.valid_until IS NULL OR c.valid_until >= now())
  LIMIT 1
$function$;

-- 8 & 9. Revoke EXECUTE on trigger-only functions from authenticated
--        These are invoked by postgres triggers, not via REST RPC.
REVOKE EXECUTE ON FUNCTION public.process_invite_signup() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.process_invite_purchase() FROM authenticated;
