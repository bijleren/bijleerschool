/*
  # Extend Reading Sessions and Feedback System

  1. Changes to Existing Tables
    - Add columns to `reading_sessions` for emotion tracking and audio recordings
    - Add columns to `book_reviews` for enhanced feedback (emotion, audio, photos)
    - Add `material_feedback` table for material returns

  2. New Storage Buckets
    - `reading-audio` - Audio recordings during reading sessions
    - `feedback-audio` - Audio feedback when returning items  
    - `feedback-photos` - Photos of students with books/materials

  3. Security
    - Add public read/write policies for new storage buckets
    - Update RLS policies to allow public access for students
*/

-- Add new columns to reading_sessions
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'reading_sessions' AND column_name = 'emotion'
  ) THEN
    ALTER TABLE reading_sessions ADD COLUMN emotion text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'reading_sessions' AND column_name = 'audio_url'
  ) THEN
    ALTER TABLE reading_sessions ADD COLUMN audio_url text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'reading_sessions' AND column_name = 'manual_duration'
  ) THEN
    ALTER TABLE reading_sessions ADD COLUMN manual_duration boolean DEFAULT false;
  END IF;
END $$;

-- Add new columns to book_reviews for enhanced feedback
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'book_reviews' AND column_name = 'emotion'
  ) THEN
    ALTER TABLE book_reviews ADD COLUMN emotion text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'book_reviews' AND column_name = 'audio_url'
  ) THEN
    ALTER TABLE book_reviews ADD COLUMN audio_url text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'book_reviews' AND column_name = 'photo_url'
  ) THEN
    ALTER TABLE book_reviews ADD COLUMN photo_url text;
  END IF;
END $$;

-- Create material_feedback table
CREATE TABLE IF NOT EXISTS material_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  material_loan_id uuid NOT NULL REFERENCES school_material_loans(id) ON DELETE CASCADE,
  material_id uuid NOT NULL REFERENCES school_materials(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  text_feedback text,
  audio_url text,
  photo_url text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE material_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view material feedback"
  ON material_feedback FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Authenticated users can view material feedback"
  ON material_feedback FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Public can create material feedback"
  ON material_feedback FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Authenticated users can create material feedback"
  ON material_feedback FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_material_feedback_student_id ON material_feedback(student_id);
CREATE INDEX IF NOT EXISTS idx_material_feedback_material_id ON material_feedback(material_id);

-- Add public access policies to reading_sessions if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'reading_sessions' 
    AND policyname = 'Public can view reading sessions'
  ) THEN
    CREATE POLICY "Public can view reading sessions"
      ON reading_sessions FOR SELECT
      TO anon
      USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'reading_sessions' 
    AND policyname = 'Public can create reading sessions'
  ) THEN
    CREATE POLICY "Public can create reading sessions"
      ON reading_sessions FOR INSERT
      TO anon
      WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'reading_sessions' 
    AND policyname = 'Public can update reading sessions'
  ) THEN
    CREATE POLICY "Public can update reading sessions"
      ON reading_sessions FOR UPDATE
      TO anon
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;

-- Add public access policies to book_reviews if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'book_reviews' 
    AND policyname = 'Public can view book reviews'
  ) THEN
    CREATE POLICY "Public can view book reviews"
      ON book_reviews FOR SELECT
      TO anon
      USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'book_reviews' 
    AND policyname = 'Public can create book reviews'
  ) THEN
    CREATE POLICY "Public can create book reviews"
      ON book_reviews FOR INSERT
      TO anon
      WITH CHECK (true);
  END IF;
END $$;

-- Create Storage Buckets
INSERT INTO storage.buckets (id, name, public)
VALUES 
  ('reading-audio', 'reading-audio', true),
  ('feedback-audio', 'feedback-audio', true),
  ('feedback-photos', 'feedback-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Storage Policies for reading-audio bucket
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'objects' 
    AND schemaname = 'storage'
    AND policyname = 'Anyone can upload reading audio'
  ) THEN
    CREATE POLICY "Anyone can upload reading audio"
      ON storage.objects FOR INSERT
      TO public
      WITH CHECK (bucket_id = 'reading-audio');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'objects' 
    AND schemaname = 'storage'
    AND policyname = 'Anyone can view reading audio'
  ) THEN
    CREATE POLICY "Anyone can view reading audio"
      ON storage.objects FOR SELECT
      TO public
      USING (bucket_id = 'reading-audio');
  END IF;
END $$;

-- Storage Policies for feedback-audio bucket
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'objects' 
    AND schemaname = 'storage'
    AND policyname = 'Anyone can upload feedback audio'
  ) THEN
    CREATE POLICY "Anyone can upload feedback audio"
      ON storage.objects FOR INSERT
      TO public
      WITH CHECK (bucket_id = 'feedback-audio');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'objects' 
    AND schemaname = 'storage'
    AND policyname = 'Anyone can view feedback audio'
  ) THEN
    CREATE POLICY "Anyone can view feedback audio"
      ON storage.objects FOR SELECT
      TO public
      USING (bucket_id = 'feedback-audio');
  END IF;
END $$;

-- Storage Policies for feedback-photos bucket
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'objects' 
    AND schemaname = 'storage'
    AND policyname = 'Anyone can upload feedback photos'
  ) THEN
    CREATE POLICY "Anyone can upload feedback photos"
      ON storage.objects FOR INSERT
      TO public
      WITH CHECK (bucket_id = 'feedback-photos');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'objects' 
    AND schemaname = 'storage'
    AND policyname = 'Anyone can view feedback photos'
  ) THEN
    CREATE POLICY "Anyone can view feedback photos"
      ON storage.objects FOR SELECT
      TO public
      USING (bucket_id = 'feedback-photos');
  END IF;
END $$;