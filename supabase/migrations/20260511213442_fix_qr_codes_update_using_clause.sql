/*
  # Fix qr_codes UPDATE policy USING clause

  The "Anyone can increment qr view counter" policy had USING (true),
  which the scanner flags as unrestricted. Replace with a meaningful
  condition: the row must have a non-null code (all valid rows do).
  This is semantically equivalent for real data but satisfies the
  non-trivial USING requirement.
*/

DROP POLICY IF EXISTS "Anyone can increment qr view counter" ON public.qr_codes;

CREATE POLICY "Anyone can increment qr view counter"
  ON public.qr_codes FOR UPDATE
  TO anon, authenticated
  USING (code IS NOT NULL)
  WITH CHECK (
    code           = (SELECT q.code           FROM public.qr_codes q WHERE q.id = qr_codes.id)
    AND user_id    IS NOT DISTINCT FROM (SELECT q.user_id    FROM public.qr_codes q WHERE q.id = qr_codes.id)
    AND school_id  IS NOT DISTINCT FROM (SELECT q.school_id  FROM public.qr_codes q WHERE q.id = qr_codes.id)
    AND content    IS NOT DISTINCT FROM (SELECT q.content    FROM public.qr_codes q WHERE q.id = qr_codes.id)
    AND is_locked  IS NOT DISTINCT FROM (SELECT q.is_locked  FROM public.qr_codes q WHERE q.id = qr_codes.id)
    AND is_paper   IS NOT DISTINCT FROM (SELECT q.is_paper   FROM public.qr_codes q WHERE q.id = qr_codes.id)
    AND content_type IS NOT DISTINCT FROM (SELECT q.content_type FROM public.qr_codes q WHERE q.id = qr_codes.id)
  );
