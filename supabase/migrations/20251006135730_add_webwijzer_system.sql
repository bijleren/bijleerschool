-- Add WebWijzer System
--
-- Overview:
-- This migration creates the complete WebWijzer system that allows teachers to share content 
-- (videos, files, links) with students in a low-friction way using QR codes.
--
-- New Columns in Existing Tables:
-- 1. students table
--    - student_code (text, unique, 8 characters) - Unique code for student access
--    - access_hash (text, unique) - Hash for QR code authentication
--
-- New Tables:
-- 1. webwijzer_content - Stores all content items (videos, files, links)
-- 2. webwijzer_assignments - Links content to students/groups with settings
-- 3. webwijzer_usage - Tracks individual content access
-- 4. webwijzer_access_log - Tracks page access
--
-- Security:
-- - Enable RLS on all new tables
-- - Teachers can manage content for their schools
-- - Public access to student webwijzer pages with proper authentication

-- Add student_code and access_hash to students table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'students' AND column_name = 'student_code'
  ) THEN
    ALTER TABLE students ADD COLUMN student_code text UNIQUE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'students' AND column_name = 'access_hash'
  ) THEN
    ALTER TABLE students ADD COLUMN access_hash text UNIQUE;
  END IF;
END $$;

-- Create index for fast lookups
CREATE INDEX IF NOT EXISTS idx_students_student_code ON students(student_code);
CREATE INDEX IF NOT EXISTS idx_students_access_hash ON students(access_hash);

-- Function to generate random student code (8 alphanumeric characters)
CREATE OR REPLACE FUNCTION generate_student_code()
RETURNS text AS $$
DECLARE
  chars text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; -- Excluding confusing characters
  result text := '';
  i integer;
BEGIN
  FOR i IN 1..8 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
  END LOOP;
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Function to generate access hash
CREATE OR REPLACE FUNCTION generate_access_hash()
RETURNS text AS $$
BEGIN
  RETURN encode(gen_random_bytes(32), 'base64');
END;
$$ LANGUAGE plpgsql;

-- Create webwijzer_content table
CREATE TABLE IF NOT EXISTS webwijzer_content (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users NOT NULL,
  title text NOT NULL,
  content_type text NOT NULL CHECK (content_type IN ('video', 'file', 'link')),
  content_url text NOT NULL,
  symbol text DEFAULT '📎',
  color text DEFAULT '#3B82F6',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE webwijzer_content ENABLE ROW LEVEL SECURITY;

-- Create webwijzer_assignments table
CREATE TABLE IF NOT EXISTS webwijzer_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content_id uuid REFERENCES webwijzer_content(id) ON DELETE CASCADE NOT NULL,
  assignable_type text NOT NULL CHECK (assignable_type IN ('student', 'group')),
  assignable_id uuid NOT NULL,
  is_push boolean DEFAULT false,
  is_favorite boolean DEFAULT false,
  click_limit integer,
  clicks_used integer DEFAULT 0,
  is_archived boolean DEFAULT false,
  push_completed boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE webwijzer_assignments ENABLE ROW LEVEL SECURITY;

-- Create indexes for assignments
CREATE INDEX IF NOT EXISTS idx_assignments_content ON webwijzer_assignments(content_id);
CREATE INDEX IF NOT EXISTS idx_assignments_assignable ON webwijzer_assignments(assignable_type, assignable_id);
CREATE INDEX IF NOT EXISTS idx_assignments_archived ON webwijzer_assignments(is_archived);

-- Create webwijzer_usage table
CREATE TABLE IF NOT EXISTS webwijzer_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id uuid REFERENCES webwijzer_assignments(id) ON DELETE CASCADE NOT NULL,
  student_id uuid REFERENCES students(id) ON DELETE CASCADE NOT NULL,
  accessed_at timestamptz DEFAULT now()
);

ALTER TABLE webwijzer_usage ENABLE ROW LEVEL SECURITY;

-- Create indexes for usage tracking
CREATE INDEX IF NOT EXISTS idx_usage_assignment ON webwijzer_usage(assignment_id);
CREATE INDEX IF NOT EXISTS idx_usage_student ON webwijzer_usage(student_id);
CREATE INDEX IF NOT EXISTS idx_usage_accessed_at ON webwijzer_usage(accessed_at);

-- Create webwijzer_access_log table
CREATE TABLE IF NOT EXISTS webwijzer_access_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid REFERENCES students(id) ON DELETE CASCADE NOT NULL,
  access_method text NOT NULL CHECK (access_method IN ('qr', 'manual')),
  accessed_at timestamptz DEFAULT now()
);

ALTER TABLE webwijzer_access_log ENABLE ROW LEVEL SECURITY;

-- Create indexes for access log
CREATE INDEX IF NOT EXISTS idx_access_log_student ON webwijzer_access_log(student_id);
CREATE INDEX IF NOT EXISTS idx_access_log_accessed_at ON webwijzer_access_log(accessed_at);

-- RLS Policies for webwijzer_content
CREATE POLICY "Teachers can view own content"
  ON webwijzer_content FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Teachers can create content"
  ON webwijzer_content FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Teachers can update own content"
  ON webwijzer_content FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Teachers can delete own content"
  ON webwijzer_content FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- RLS Policies for webwijzer_assignments
CREATE POLICY "Teachers can view assignments for their schools"
  ON webwijzer_assignments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM webwijzer_content wc
      WHERE wc.id = content_id AND wc.user_id = auth.uid()
    )
  );

CREATE POLICY "Public can view assignments for student access"
  ON webwijzer_assignments FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Teachers can create assignments"
  ON webwijzer_assignments FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM webwijzer_content wc
      WHERE wc.id = content_id AND wc.user_id = auth.uid()
    )
  );

CREATE POLICY "Teachers can update assignments"
  ON webwijzer_assignments FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM webwijzer_content wc
      WHERE wc.id = content_id AND wc.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM webwijzer_content wc
      WHERE wc.id = content_id AND wc.user_id = auth.uid()
    )
  );

CREATE POLICY "Teachers can delete assignments"
  ON webwijzer_assignments FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM webwijzer_content wc
      WHERE wc.id = content_id AND wc.user_id = auth.uid()
    )
  );

-- RLS Policies for webwijzer_usage
CREATE POLICY "Public can insert usage records"
  ON webwijzer_usage FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Teachers can view usage for their content"
  ON webwijzer_usage FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM webwijzer_assignments wa
      JOIN webwijzer_content wc ON wc.id = wa.content_id
      WHERE wa.id = assignment_id AND wc.user_id = auth.uid()
    )
  );

-- RLS Policies for webwijzer_access_log
CREATE POLICY "Public can insert access logs"
  ON webwijzer_access_log FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Teachers can view access logs for their school students"
  ON webwijzer_access_log FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM students s
      JOIN user_schools us ON us.school_id = s.school_id
      WHERE s.id = student_id AND us.user_id = auth.uid()
    )
  );