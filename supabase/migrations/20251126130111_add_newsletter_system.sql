/*
  # Newsletter System for Premium Schools

  1. New Tables
    - `newsletters`
      - `id` (uuid, primary key)
      - `school_id` (uuid, references schools, nullable for global newsletters)
      - `title` (text)
      - `description` (text)
      - `file_path` (text, path to PDF in storage)
      - `created_by` (uuid, references profiles)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Storage
    - Create 'newsletters' bucket for PDF files
    - Set up appropriate storage policies

  3. Security
    - Enable RLS on newsletters table
    - Admins can create, update, delete newsletters
    - Premium school users can view newsletters
    - Storage policies for authenticated users

  4. Notes
    - Newsletters can be school-specific or global (null school_id)
    - Only premium schools can access the newsletter feature
    - PDFs are stored in Supabase storage
*/

-- Create newsletters table
CREATE TABLE IF NOT EXISTS newsletters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid REFERENCES schools(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  file_path text NOT NULL,
  created_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE newsletters ENABLE ROW LEVEL SECURITY;

-- Admins can manage all newsletters
CREATE POLICY "Admins can view all newsletters"
  ON newsletters FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_schools
      WHERE user_schools.user_id = auth.uid()
      AND user_schools.role = 'admin'
      AND user_schools.is_active = true
    )
  );

CREATE POLICY "Admins can insert newsletters"
  ON newsletters FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_schools
      WHERE user_schools.user_id = auth.uid()
      AND user_schools.role = 'admin'
      AND user_schools.is_active = true
    )
  );

CREATE POLICY "Admins can update newsletters"
  ON newsletters FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_schools
      WHERE user_schools.user_id = auth.uid()
      AND user_schools.role = 'admin'
      AND user_schools.is_active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_schools
      WHERE user_schools.user_id = auth.uid()
      AND user_schools.role = 'admin'
      AND user_schools.is_active = true
    )
  );

CREATE POLICY "Admins can delete newsletters"
  ON newsletters FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_schools
      WHERE user_schools.user_id = auth.uid()
      AND user_schools.role = 'admin'
      AND user_schools.is_active = true
    )
  );

-- Premium school users can view newsletters (global or for their school)
CREATE POLICY "Premium school users can view newsletters"
  ON newsletters FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_schools
      JOIN schools ON schools.id = user_schools.school_id
      WHERE user_schools.user_id = auth.uid()
      AND schools.premium_school = 1
      AND user_schools.is_active = true
      AND (
        newsletters.school_id IS NULL
        OR newsletters.school_id = user_schools.school_id
      )
    )
  );

-- Create storage bucket for newsletters
INSERT INTO storage.buckets (id, name, public)
VALUES ('newsletters', 'newsletters', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for newsletters bucket
CREATE POLICY "Admins can upload newsletter PDFs"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'newsletters'
    AND EXISTS (
      SELECT 1 FROM user_schools
      WHERE user_schools.user_id = auth.uid()
      AND user_schools.role = 'admin'
      AND user_schools.is_active = true
    )
  );

CREATE POLICY "Admins can update newsletter PDFs"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'newsletters'
    AND EXISTS (
      SELECT 1 FROM user_schools
      WHERE user_schools.user_id = auth.uid()
      AND user_schools.role = 'admin'
      AND user_schools.is_active = true
    )
  );

CREATE POLICY "Admins can delete newsletter PDFs"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'newsletters'
    AND EXISTS (
      SELECT 1 FROM user_schools
      WHERE user_schools.user_id = auth.uid()
      AND user_schools.role = 'admin'
      AND user_schools.is_active = true
    )
  );

CREATE POLICY "Premium school users can download newsletter PDFs"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'newsletters'
    AND EXISTS (
      SELECT 1 FROM user_schools
      JOIN schools ON schools.id = user_schools.school_id
      WHERE user_schools.user_id = auth.uid()
      AND schools.premium_school = 1
      AND user_schools.is_active = true
    )
  );

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_newsletters_school_id ON newsletters(school_id);
CREATE INDEX IF NOT EXISTS idx_newsletters_created_at ON newsletters(created_at DESC);
