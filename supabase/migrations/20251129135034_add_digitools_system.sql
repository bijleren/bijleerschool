/*
  # Add DigiTools System
  
  This migration creates the DigiTools system that allows admins to manage and showcase
  digital tools and applications.
  
  1. New Tables
    - `digitools` - Stores all digital tool information
  
  2. Columns
    - `id` (uuid, primary key) - Unique identifier
    - `title` (text) - Tool name
    - `description` (text) - Tool description
    - `screenshot_url` (text) - URL to tool screenshot
    - `link` (text) - External link to the tool
    - `is_beta` (boolean) - Beta flag
    - `is_new` (boolean) - New flag
    - `is_active` (boolean) - Active/inactive status
    - `created_at` (timestamptz) - Creation timestamp
    - `updated_at` (timestamptz) - Last update timestamp
  
  3. Security
    - Enable RLS on digitools table
    - Public read access for active tools
    - Only admins can create, update, or delete tools
*/

-- Create digitools table
CREATE TABLE IF NOT EXISTS digitools (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text NOT NULL,
  screenshot_url text,
  link text NOT NULL,
  is_beta boolean DEFAULT false,
  is_new boolean DEFAULT false,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE digitools ENABLE ROW LEVEL SECURITY;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_digitools_is_active ON digitools(is_active);
CREATE INDEX IF NOT EXISTS idx_digitools_is_new ON digitools(is_new);
CREATE INDEX IF NOT EXISTS idx_digitools_is_beta ON digitools(is_beta);

-- RLS Policies
CREATE POLICY "Public can view active digitools"
  ON digitools FOR SELECT
  TO authenticated, anon
  USING (is_active = true);

CREATE POLICY "Admins can view all digitools"
  ON digitools FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_schools us
      WHERE us.user_id = auth.uid() AND us.role = 'admin'
    )
  );

CREATE POLICY "Admins can create digitools"
  ON digitools FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_schools us
      WHERE us.user_id = auth.uid() AND us.role = 'admin'
    )
  );

CREATE POLICY "Admins can update digitools"
  ON digitools FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_schools us
      WHERE us.user_id = auth.uid() AND us.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_schools us
      WHERE us.user_id = auth.uid() AND us.role = 'admin'
    )
  );

CREATE POLICY "Admins can delete digitools"
  ON digitools FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_schools us
      WHERE us.user_id = auth.uid() AND us.role = 'admin'
    )
  );

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_digitools_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_digitools_updated_at ON digitools;
CREATE TRIGGER trigger_digitools_updated_at
  BEFORE UPDATE ON digitools
  FOR EACH ROW
  EXECUTE FUNCTION update_digitools_updated_at();
