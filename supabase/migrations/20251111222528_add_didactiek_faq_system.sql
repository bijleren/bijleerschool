/*
  # Add Didactiek FAQ System

  1. New Tables
    - `didactiek_faq`
      - `id` (uuid, primary key)
      - `question` (text) - The FAQ question
      - `answer` (text) - The FAQ answer content
      - `category` (text) - Category for organizing FAQs
      - `display_order` (integer) - Order in which FAQs should be displayed
      - `is_published` (boolean) - Whether the FAQ is visible to users
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
      - `created_by` (uuid) - Reference to user who created it
      - `updated_by` (uuid) - Reference to user who last updated it

  2. Security
    - Enable RLS on `didactiek_faq` table
    - Authenticated users can read published FAQs
    - Only admins (super_admin role) can create/update/delete FAQs

  3. Indexes
    - Index on display_order for sorting
    - Index on category for filtering
    - Index on is_published for filtering
*/

-- Create the didactiek_faq table
CREATE TABLE IF NOT EXISTS didactiek_faq (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question text NOT NULL,
  answer text NOT NULL,
  category text DEFAULT 'general',
  display_order integer DEFAULT 0,
  is_published boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_didactiek_faq_display_order ON didactiek_faq(display_order);
CREATE INDEX IF NOT EXISTS idx_didactiek_faq_category ON didactiek_faq(category);
CREATE INDEX IF NOT EXISTS idx_didactiek_faq_is_published ON didactiek_faq(is_published);

-- Enable RLS
ALTER TABLE didactiek_faq ENABLE ROW LEVEL SECURITY;

-- Policy: Authenticated users can read published FAQs
CREATE POLICY "Users can read published FAQs"
  ON didactiek_faq FOR SELECT
  TO authenticated
  USING (is_published = true);

-- Policy: Super admins can manage all FAQs
CREATE POLICY "Super admins can manage FAQs"
  ON didactiek_faq FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.raw_user_meta_data->>'role' = 'super_admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.raw_user_meta_data->>'role' = 'super_admin'
    )
  );

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_didactiek_faq_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS trigger_update_didactiek_faq_updated_at ON didactiek_faq;
CREATE TRIGGER trigger_update_didactiek_faq_updated_at
  BEFORE UPDATE ON didactiek_faq
  FOR EACH ROW
  EXECUTE FUNCTION update_didactiek_faq_updated_at();
