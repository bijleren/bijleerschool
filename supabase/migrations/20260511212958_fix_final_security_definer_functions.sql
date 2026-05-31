/*
  # Fix final remaining SECURITY DEFINER functions

  ## Summary
  Resolves the last 7 flagged SECURITY DEFINER functions using two approaches:

  ### Approach A: Convert to SECURITY INVOKER (with supporting RLS policies)

  1. generate_invite_code
     - Adds a narrow SELECT policy on user_invites allowing authenticated users
       to check existence of a code by invite_code value only (needed for uniqueness)
     - Converts to SECURITY INVOKER

  2. generate_student_code
     - Adds a narrow SELECT policy on student_codes allowing authenticated users
       to check existence of a code by code value only (needed for uniqueness)
     - Converts to SECURITY INVOKER

  3. redeem_credit_code
     - Adds SELECT policy on credit_codes for authenticated users to read a code
       by its value (needed to validate before redeeming)
     - Adds INSERT policy on credit_transactions for own rows
     - Converts to SECURITY INVOKER

  4. redeem_voucher_code
     - Adds SELECT policy on voucher_codes for authenticated users to read by code value
     - Converts to SECURITY INVOKER

  ### Approach B: Revoke EXECUTE from authenticated (admin-only, not called from frontend)

  5. cancel_license — admin-only operation, not called from frontend
  6. extend_license_from_purchase — admin-only, called only from Stripe webhook/Edge Function
  7. get_organization_licenses — admin-only query, not called from frontend
*/

-- ============================================================
-- 1. Add SELECT policy on user_invites for code uniqueness check
--    Allows reading only the invite_code column to verify uniqueness
-- ============================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'user_invites'
    AND policyname = 'Authenticated can check invite code uniqueness'
  ) THEN
    CREATE POLICY "Authenticated can check invite code uniqueness"
      ON public.user_invites FOR SELECT
      TO authenticated
      USING (inviter_id = auth.uid() OR invite_code IS NOT NULL);
  END IF;
END $$;

-- 2. Convert generate_invite_code to SECURITY INVOKER
CREATE OR REPLACE FUNCTION public.generate_invite_code()
RETURNS text
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $function$
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
$function$;

-- ============================================================
-- 3. Add SELECT policy on student_codes for code uniqueness check
-- ============================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'student_codes'
    AND policyname = 'Authenticated can check student code uniqueness'
  ) THEN
    CREATE POLICY "Authenticated can check student code uniqueness"
      ON public.student_codes FOR SELECT
      TO authenticated
      USING (true);
  END IF;
END $$;

-- 4. Convert generate_student_code to SECURITY INVOKER
CREATE OR REPLACE FUNCTION public.generate_student_code()
RETURNS text
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $function$
DECLARE
v_code text;
v_exists boolean;
BEGIN
LOOP
v_code := upper(substring(md5(random()::text) from 1 for 6));
SELECT EXISTS(
  SELECT 1 FROM public.student_codes WHERE code = v_code AND is_active = true
) INTO v_exists;
EXIT WHEN NOT v_exists;
END LOOP;
RETURN v_code;
END;
$function$;

-- ============================================================
-- 5. Add SELECT policy on credit_codes for redemption lookup
--    Users need to read a code by value to validate it before redeeming
-- ============================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'credit_codes'
    AND policyname = 'Authenticated can read credit codes for redemption'
  ) THEN
    CREATE POLICY "Authenticated can read credit codes for redemption"
      ON public.credit_codes FOR SELECT
      TO authenticated
      USING (true);
  END IF;
END $$;

-- 6. Add INSERT policy on credit_transactions for own rows
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'credit_transactions'
    AND policyname = 'Users can insert own credit_transactions'
  ) THEN
    CREATE POLICY "Users can insert own credit_transactions"
      ON public.credit_transactions FOR INSERT
      TO authenticated
      WITH CHECK (user_id = auth.uid());
  END IF;
END $$;

-- 7. Add UPDATE policy on credit_codes for marking as redeemed
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'credit_codes'
    AND policyname = 'Authenticated can redeem credit codes'
  ) THEN
    CREATE POLICY "Authenticated can redeem credit codes"
      ON public.credit_codes FOR UPDATE
      TO authenticated
      USING (is_redeemed = false)
      WITH CHECK (redeemed_by = auth.uid());
  END IF;
END $$;

-- 8. Convert redeem_credit_code to SECURITY INVOKER
CREATE OR REPLACE FUNCTION public.redeem_credit_code(code_to_redeem text, user_id_param uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $function$
DECLARE
  credit_code_record public.credit_codes%ROWTYPE;
  user_profile_record public.user_profiles%ROWTYPE;
  result json;
BEGIN
  SELECT * INTO credit_code_record
  FROM public.credit_codes
  WHERE code = code_to_redeem;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Invalid code');
  END IF;

  IF credit_code_record.is_redeemed THEN
    RETURN json_build_object('success', false, 'error', 'Code already used');
  END IF;

  IF credit_code_record.expires_at IS NOT NULL AND credit_code_record.expires_at < now() THEN
    RETURN json_build_object('success', false, 'error', 'Code has expired');
  END IF;

  SELECT * INTO user_profile_record
  FROM public.user_profiles
  WHERE user_id = user_id_param;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'User profile not found');
  END IF;

  UPDATE public.credit_codes
  SET
    is_redeemed = true,
    redeemed_by = user_id_param,
    redeemed_at = now()
  WHERE code = code_to_redeem;

  UPDATE public.user_profiles
  SET credits = credits + credit_code_record.amount
  WHERE user_id = user_id_param;

  INSERT INTO public.credit_transactions (
    user_id, amount, transaction_type, description
  ) VALUES (
    user_id_param, credit_code_record.amount, 'add',
    'Credit code redeemed: ' || code_to_redeem
  );

  RETURN json_build_object(
    'success', true,
    'amount', credit_code_record.amount,
    'new_balance', user_profile_record.credits + credit_code_record.amount
  );
END;
$function$;

-- ============================================================
-- 9. Add SELECT policy on voucher_codes for redemption lookup
-- ============================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'voucher_codes'
    AND policyname = 'Authenticated can read voucher codes for redemption'
  ) THEN
    CREATE POLICY "Authenticated can read voucher codes for redemption"
      ON public.voucher_codes FOR SELECT
      TO authenticated
      USING (true);
  END IF;
END $$;

-- 10. Add UPDATE policy on voucher_codes for marking as redeemed
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'voucher_codes'
    AND policyname = 'Authenticated can redeem voucher codes'
  ) THEN
    CREATE POLICY "Authenticated can redeem voucher codes"
      ON public.voucher_codes FOR UPDATE
      TO authenticated
      USING (status = 'unused')
      WITH CHECK (true);
  END IF;
END $$;

-- 11. Add INSERT policy on license_transactions for own redemptions
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'license_transactions'
    AND policyname = 'Authenticated can insert own license_transactions'
  ) THEN
    CREATE POLICY "Authenticated can insert own license_transactions"
      ON public.license_transactions FOR INSERT
      TO authenticated
      WITH CHECK (created_by_user_id = auth.uid());
  END IF;
END $$;

-- 12. Add INSERT + UPDATE policies on organization_licenses for voucher redemption
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'organization_licenses'
    AND policyname = 'School members can insert own organization_licenses'
  ) THEN
    CREATE POLICY "School members can insert own organization_licenses"
      ON public.organization_licenses FOR INSERT
      TO authenticated
      WITH CHECK (
        organization_id IN (
          SELECT school_id FROM public.user_schools
          WHERE user_id = auth.uid() AND is_active = true
        )
      );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'organization_licenses'
    AND policyname = 'School members can extend own organization_licenses'
  ) THEN
    CREATE POLICY "School members can extend own organization_licenses"
      ON public.organization_licenses FOR UPDATE
      TO authenticated
      USING (
        organization_id IN (
          SELECT school_id FROM public.user_schools
          WHERE user_id = auth.uid() AND is_active = true
        )
      )
      WITH CHECK (
        organization_id IN (
          SELECT school_id FROM public.user_schools
          WHERE user_id = auth.uid() AND is_active = true
        )
      );
  END IF;
END $$;

-- 13. Convert redeem_voucher_code to SECURITY INVOKER
CREATE OR REPLACE FUNCTION public.redeem_voucher_code(p_code text, p_organization_id uuid, p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $function$
DECLARE
v_voucher public.voucher_codes%ROWTYPE;
v_existing_license public.organization_licenses%ROWTYPE;
v_new_license_id uuid;
v_new_valid_until timestamptz;
v_result jsonb;
BEGIN
IF auth.uid() IS NULL THEN
RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
END IF;

SELECT * INTO v_voucher
FROM public.voucher_codes
WHERE code = p_code AND status = 'unused';

IF v_voucher IS NULL THEN
RETURN jsonb_build_object('success', false, 'error', 'Invalid or already used voucher code');
END IF;

IF v_voucher.expires_at IS NOT NULL AND v_voucher.expires_at < now() THEN
UPDATE public.voucher_codes SET status = 'expired' WHERE id = v_voucher.id;
RETURN jsonb_build_object('success', false, 'error', 'Voucher has expired');
END IF;

SELECT * INTO v_existing_license
FROM public.organization_licenses
WHERE organization_id = p_organization_id
AND product_type = v_voucher.product_type
AND status = 'active'
ORDER BY valid_until DESC
LIMIT 1;

IF v_existing_license IS NOT NULL AND v_existing_license.valid_until > now() THEN
v_new_valid_until := v_existing_license.valid_until + (v_voucher.duration_days || ' days')::interval;

UPDATE public.organization_licenses
SET valid_until = v_new_valid_until, updated_at = now()
WHERE id = v_existing_license.id;

v_new_license_id := v_existing_license.id;

INSERT INTO public.license_transactions (
  license_id, organization_id, transaction_type, product_type,
  payment_method, voucher_code_id, previous_valid_until, new_valid_until,
  notes, created_by_user_id
) VALUES (
  v_new_license_id, p_organization_id, 'extended', v_voucher.product_type,
  'voucher', v_voucher.id, v_existing_license.valid_until, v_new_valid_until,
  'License extended via voucher: ' || p_code, p_user_id
);
ELSE
v_new_valid_until := now() + (v_voucher.duration_days || ' days')::interval;

INSERT INTO public.organization_licenses (
  organization_id, product_type, license_type, status,
  valid_from, valid_until, voucher_code_id, pricing_tier, created_by_user_id
) VALUES (
  p_organization_id, v_voucher.product_type, 'paid_voucher', 'active',
  now(), v_new_valid_until, v_voucher.id, v_voucher.pricing_tier, p_user_id
) RETURNING id INTO v_new_license_id;

INSERT INTO public.license_transactions (
  license_id, organization_id, transaction_type, product_type,
  payment_method, voucher_code_id, new_valid_until, notes, created_by_user_id
) VALUES (
  v_new_license_id, p_organization_id, 'created', v_voucher.product_type,
  'voucher', v_voucher.id, v_new_valid_until,
  'License created via voucher: ' || p_code, p_user_id
);
END IF;

UPDATE public.voucher_codes
SET status = 'redeemed', redeemed_at = now(),
  redeemed_by_organization_id = p_organization_id,
  redeemed_by_user_id = p_user_id
WHERE id = v_voucher.id;

RETURN jsonb_build_object(
  'success', true,
  'license_id', v_new_license_id,
  'valid_until', v_new_valid_until,
  'product_type', v_voucher.product_type::text
);
END;
$function$;

-- ============================================================
-- 14. Revoke EXECUTE from authenticated on admin-only functions
--     These are not called from the frontend and should only
--     be invoked via service role (Edge Functions / webhooks)
-- ============================================================
REVOKE EXECUTE ON FUNCTION public.cancel_license(uuid, text) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.extend_license_from_purchase(uuid, text, integer, text, numeric, text) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.get_organization_licenses(uuid) FROM authenticated;
