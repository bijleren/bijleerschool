/*
  # Emergency Broadcasts System

  ## Purpose
  A global emergency broadcast system that allows platform admins to push
  visible alert messages to all logged-in users across one or all platforms,
  without requiring a deployment.

  ## New Tables
  - `emergency_broadcasts`
    - `id` (uuid, primary key)
    - `platform` (text) — e.g. 'bijleer.school', 'other-app.com', or 'all'
    - `is_active` (boolean) — master on/off switch
    - `type` (text) — 'info' | 'warning' | 'danger'
    - `title` (text) — short headline shown to users
    - `content` (text) — HTML body from WYSIWYG editor
    - `starts_at` (timestamptz, nullable) — optional schedule start
    - `ends_at` (timestamptz, nullable) — optional schedule end
    - `created_by` (uuid, nullable) — references auth.users
    - `created_at`, `updated_at` (timestamptz)

  ## Security
  - RLS enabled
  - Authenticated users can SELECT broadcasts for their platform or 'all'
  - Only platform admins (role='admin' in Bijleren school) can INSERT/UPDATE/DELETE
    via a security-definer helper function

  ## Seeded rows
  - One default inactive row for platform 'bijleer.school'
  - One default inactive row for platform 'all'

  ## Notes
  - `updated_at` is auto-updated via trigger — dismissal detection on client uses this
  - The table is never dropped by future migrations — it persists across deployments
*/

-- Create the table
CREATE TABLE IF NOT EXISTS emergency_broadcasts (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  platform    text NOT NULL DEFAULT 'bijleer.school',
  is_active   boolean NOT NULL DEFAULT false,
  type        text NOT NULL DEFAULT 'info' CHECK (type IN ('info', 'warning', 'danger')),
  title       text NOT NULL DEFAULT '',
  content     text NOT NULL DEFAULT '',
  starts_at   timestamptz,
  ends_at     timestamptz,
  created_by  uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.set_emergency_broadcast_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_emergency_broadcasts_updated_at ON emergency_broadcasts;
CREATE TRIGGER trg_emergency_broadcasts_updated_at
  BEFORE UPDATE ON emergency_broadcasts
  FOR EACH ROW EXECUTE FUNCTION public.set_emergency_broadcast_updated_at();

-- Enable RLS
ALTER TABLE emergency_broadcasts ENABLE ROW LEVEL SECURITY;

-- Helper: check if current user is a platform admin (Bijleren school, role=admin)
CREATE OR REPLACE FUNCTION public.is_platform_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_school_id uuid;
BEGIN
  SELECT id INTO v_school_id FROM schools WHERE name = 'Bijleren' LIMIT 1;
  IF v_school_id IS NULL THEN RETURN false; END IF;
  RETURN EXISTS (
    SELECT 1 FROM user_schools
    WHERE user_id  = auth.uid()
      AND school_id = v_school_id
      AND role      = 'admin'
      AND is_active = true
  );
END;
$$;

-- Revoke public execute, grant only to authenticated
REVOKE EXECUTE ON FUNCTION public.is_platform_admin() FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.is_platform_admin() TO authenticated;

-- RLS policies

-- Authenticated users can read active broadcasts for their platform or 'all'
CREATE POLICY "Authenticated users can read broadcasts"
  ON emergency_broadcasts FOR SELECT
  TO authenticated
  USING (true);

-- Only platform admins can insert
CREATE POLICY "Platform admins can insert broadcasts"
  ON emergency_broadcasts FOR INSERT
  TO authenticated
  WITH CHECK (public.is_platform_admin());

-- Only platform admins can update
CREATE POLICY "Platform admins can update broadcasts"
  ON emergency_broadcasts FOR UPDATE
  TO authenticated
  USING (public.is_platform_admin())
  WITH CHECK (public.is_platform_admin());

-- Only platform admins can delete
CREATE POLICY "Platform admins can delete broadcasts"
  ON emergency_broadcasts FOR DELETE
  TO authenticated
  USING (public.is_platform_admin());

-- Seed default rows (idempotent)
INSERT INTO emergency_broadcasts (platform, is_active, type, title, content)
VALUES
  ('bijleer.school', false, 'info', '', ''),
  ('all',            false, 'warning', '', '')
ON CONFLICT DO NOTHING;
