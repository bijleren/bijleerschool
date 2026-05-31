/*
  # Create begeleiding_requests table

  ## Summary
  Creates a table to store support/coaching requests submitted by school staff through
  the Begeleiding section under Didactiek. All four request types (Bijleergesprek,
  Vorming, Demodag, Ontwikkelingsvraag) are stored in one table with a JSONB field
  holding the type-specific form data.

  ## New Tables
  - `begeleiding_requests`
    - `id` (uuid, primary key)
    - `created_at` (timestamptz)
    - `type` (text) — one of: bijleergesprek, vorming, demodag, ontwikkelingsvraag
    - `school_id` (uuid, FK → schools) — which school submitted the request
    - `submitted_by` (uuid, FK → auth.users) — who submitted it
    - `form_data` (jsonb) — all type-specific fields
    - `status` (text) — nieuw / in behandeling / afgehandeld, default 'nieuw'
    - `admin_notes` (text, nullable) — internal follow-up notes for admin

  ## Indexes
  - school_id, status, created_at desc, type

  ## Security
  - RLS enabled
  - Authenticated users can INSERT their own requests (school must belong to them)
  - Authenticated users can SELECT requests for schools they belong to
  - Platform admins can SELECT all requests and UPDATE status + admin_notes
*/

CREATE TABLE IF NOT EXISTS public.begeleiding_requests (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  type text NOT NULL,
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  submitted_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  form_data jsonb NOT NULL DEFAULT '{}',
  status text NOT NULL DEFAULT 'nieuw',
  admin_notes text NULL,
  CONSTRAINT begeleiding_requests_pkey PRIMARY KEY (id),
  CONSTRAINT begeleiding_requests_type_check CHECK (
    type IN ('bijleergesprek', 'vorming', 'demodag', 'ontwikkelingsvraag')
  ),
  CONSTRAINT begeleiding_requests_status_check CHECK (
    status IN ('nieuw', 'in behandeling', 'afgehandeld')
  )
);

CREATE INDEX IF NOT EXISTS idx_begeleiding_requests_school ON public.begeleiding_requests USING btree (school_id);
CREATE INDEX IF NOT EXISTS idx_begeleiding_requests_status ON public.begeleiding_requests USING btree (status);
CREATE INDEX IF NOT EXISTS idx_begeleiding_requests_created ON public.begeleiding_requests USING btree (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_begeleiding_requests_type ON public.begeleiding_requests USING btree (type);

ALTER TABLE public.begeleiding_requests ENABLE ROW LEVEL SECURITY;

-- Authenticated users can insert requests for schools they belong to
CREATE POLICY "School members can insert begeleiding requests"
  ON public.begeleiding_requests
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = submitted_by
    AND EXISTS (
      SELECT 1 FROM public.user_schools
      WHERE user_schools.user_id = auth.uid()
      AND user_schools.school_id = begeleiding_requests.school_id
      AND user_schools.is_active = true
    )
  );

-- Authenticated users can read requests for their own schools
CREATE POLICY "School members can read own school begeleiding requests"
  ON public.begeleiding_requests
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_schools
      WHERE user_schools.user_id = auth.uid()
      AND user_schools.school_id = begeleiding_requests.school_id
      AND user_schools.is_active = true
    )
  );

-- Platform admins can read all requests
CREATE POLICY "Platform admins can read all begeleiding requests"
  ON public.begeleiding_requests
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.school_users
      WHERE school_users.user_id = auth.uid()
      AND school_users.role = 'platform_admin'
    )
    OR EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE admin_users.email = (SELECT email FROM auth.users WHERE id = auth.uid())
    )
  );

-- Platform admins can update status and notes
CREATE POLICY "Platform admins can update begeleiding request status"
  ON public.begeleiding_requests
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.school_users
      WHERE school_users.user_id = auth.uid()
      AND school_users.role = 'platform_admin'
    )
    OR EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE admin_users.email = (SELECT email FROM auth.users WHERE id = auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.school_users
      WHERE school_users.user_id = auth.uid()
      AND school_users.role = 'platform_admin'
    )
    OR EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE admin_users.email = (SELECT email FROM auth.users WHERE id = auth.uid())
    )
  );
