/*
  # Create contact_messages table

  ## Summary
  Creates the contact_messages table for storing contact form submissions from bijleer.school.

  ## New Tables
  - `contact_messages`
    - `id` (uuid, primary key)
    - `created_at` (timestamptz)
    - `name` (text)
    - `email` (text)
    - `type` (text) — contact reason
    - `subject` (text)
    - `message` (text)
    - `ip` (text, nullable)
    - `status` (text) — default 'new'
    - `notes` (text, nullable)
    - `replied_at` (timestamptz, nullable)
    - `replied_by` (text, nullable)
    - `platform` (text) — source platform, default 'bijleer.school'

  ## Indexes
  - status, created_at desc, email

  ## Security
  - RLS enabled
  - Anonymous and authenticated users can INSERT (public contact form)
  - Authenticated users with platform_admin role in school_users can SELECT
*/

CREATE TABLE IF NOT EXISTS public.contact_messages (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  created_at timestamp with time zone DEFAULT now(),
  name text NOT NULL,
  email text NOT NULL,
  type text NOT NULL,
  subject text NOT NULL,
  message text NOT NULL,
  ip text NULL,
  status text NULL DEFAULT 'new'::text,
  notes text NULL,
  replied_at timestamp with time zone NULL,
  replied_by text NULL,
  platform text NOT NULL DEFAULT 'bijleer.school',
  CONSTRAINT contact_messages_pkey PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS idx_contact_messages_status ON public.contact_messages USING btree (status);
CREATE INDEX IF NOT EXISTS idx_contact_messages_created ON public.contact_messages USING btree (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_contact_messages_email ON public.contact_messages USING btree (email);

ALTER TABLE public.contact_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert contact messages"
  ON public.contact_messages
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Platform admins can read contact messages"
  ON public.contact_messages
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.school_users
      WHERE school_users.user_id = auth.uid()
      AND school_users.role = 'platform_admin'
    )
  );
