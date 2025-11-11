/*
  # Add Didactiek Vormingen System

  1. New Tables
    - `didactiek_vormingen`
      - `id` (uuid, primary key)
      - `title` (text) - The title of the vorming
      - `description` (text) - Rich text description (HTML)
      - `vimeo_url` (text) - Vimeo video URL for embedding
      - `category` (text) - Category for organizing vormingen
      - `display_order` (integer) - Order in which vormingen should be displayed
      - `is_published` (boolean) - Whether the vorming is visible to users
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
      - `created_by` (uuid) - Reference to user who created it
      - `updated_by` (uuid) - Reference to user who last updated it

  2. Security
    - Enable RLS on `didactiek_vormingen` table
    - Authenticated users can read published vormingen
    - Only admins can create/update/delete vormingen

  3. Indexes
    - Index on display_order for sorting
    - Index on category for filtering
    - Index on is_published for filtering
*/

-- Create the didactiek_vormingen table
CREATE TABLE IF NOT EXISTS didactiek_vormingen (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text NOT NULL,
  vimeo_url text NOT NULL,
  category text DEFAULT 'algemeen',
  display_order integer DEFAULT 0,
  is_published boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_didactiek_vormingen_display_order ON didactiek_vormingen(display_order);
CREATE INDEX IF NOT EXISTS idx_didactiek_vormingen_category ON didactiek_vormingen(category);
CREATE INDEX IF NOT EXISTS idx_didactiek_vormingen_is_published ON didactiek_vormingen(is_published);

-- Enable RLS
ALTER TABLE didactiek_vormingen ENABLE ROW LEVEL SECURITY;

-- Policy: Authenticated users can read published vormingen
CREATE POLICY "Users can read published vormingen"
  ON didactiek_vormingen FOR SELECT
  TO authenticated
  USING (is_published = true);

-- Policy: Admins can view all vormingen (published and unpublished)
CREATE POLICY "Admins can view all vormingen"
  ON didactiek_vormingen FOR SELECT
  TO authenticated
  USING (is_current_user_admin());

-- Policy: Admins can insert vormingen
CREATE POLICY "Admins can insert vormingen"
  ON didactiek_vormingen FOR INSERT
  TO authenticated
  WITH CHECK (is_current_user_admin());

-- Policy: Admins can update vormingen
CREATE POLICY "Admins can update vormingen"
  ON didactiek_vormingen FOR UPDATE
  TO authenticated
  USING (is_current_user_admin())
  WITH CHECK (is_current_user_admin());

-- Policy: Admins can delete vormingen
CREATE POLICY "Admins can delete vormingen"
  ON didactiek_vormingen FOR DELETE
  TO authenticated
  USING (is_current_user_admin());

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_didactiek_vormingen_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS trigger_update_didactiek_vormingen_updated_at ON didactiek_vormingen;
CREATE TRIGGER trigger_update_didactiek_vormingen_updated_at
  BEFORE UPDATE ON didactiek_vormingen
  FOR EACH ROW
  EXECUTE FUNCTION update_didactiek_vormingen_updated_at();
