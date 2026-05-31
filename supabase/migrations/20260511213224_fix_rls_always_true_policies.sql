/*
  # Fix RLS policies with always-true clauses

  ## Changes

  1. qr_codes "Anyone can increment qr view counter" UPDATE policy
     - USING (true) is acceptable (anyone can attempt to increment any QR code's view counter)
     - WITH CHECK was (true) — tightened to verify that only the views column changes:
       all ownership/content columns (user_id, school_id, code, content, is_locked, etc.)
       must remain identical to the existing row values.

  2. voucher_codes "Authenticated can redeem voucher codes" UPDATE policy
     - WITH CHECK was (true) — tightened to require:
       * redeemed_by_user_id must equal auth.uid() (own redemption only)
       * status must be set to 'redeemed' (not any arbitrary value)
*/

-- ============================================================
-- 1. Fix qr_codes view counter policy
-- ============================================================
DROP POLICY IF EXISTS "Anyone can increment qr view counter" ON public.qr_codes;

CREATE POLICY "Anyone can increment qr view counter"
  ON public.qr_codes FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (
    -- Immutable ownership/content columns must not change
    code           = (SELECT q.code           FROM public.qr_codes q WHERE q.id = qr_codes.id)
    AND user_id    IS NOT DISTINCT FROM (SELECT q.user_id    FROM public.qr_codes q WHERE q.id = qr_codes.id)
    AND school_id  IS NOT DISTINCT FROM (SELECT q.school_id  FROM public.qr_codes q WHERE q.id = qr_codes.id)
    AND content    IS NOT DISTINCT FROM (SELECT q.content    FROM public.qr_codes q WHERE q.id = qr_codes.id)
    AND is_locked  IS NOT DISTINCT FROM (SELECT q.is_locked  FROM public.qr_codes q WHERE q.id = qr_codes.id)
    AND is_paper   IS NOT DISTINCT FROM (SELECT q.is_paper   FROM public.qr_codes q WHERE q.id = qr_codes.id)
    AND content_type IS NOT DISTINCT FROM (SELECT q.content_type FROM public.qr_codes q WHERE q.id = qr_codes.id)
  );

-- ============================================================
-- 2. Fix voucher_codes redemption policy
-- ============================================================
DROP POLICY IF EXISTS "Authenticated can redeem voucher codes" ON public.voucher_codes;

CREATE POLICY "Authenticated can redeem voucher codes"
  ON public.voucher_codes FOR UPDATE
  TO authenticated
  USING (status = 'unused')
  WITH CHECK (
    redeemed_by_user_id = auth.uid()
    AND status = 'redeemed'
  );
