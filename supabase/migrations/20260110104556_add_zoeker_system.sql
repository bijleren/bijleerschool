/*
  # Add Zoeker System

  ## Overview
  This migration creates the Zoeker (Search Skills Trainer) system that helps students
  learn to formulate effective search queries with teacher oversight.

  ## New Tables
  1. zoeker_search_requests - Student search queries awaiting teacher approval
  2. zoeker_search_history - Track all completed searches for analytics
  3. zoeker_notifications - Real-time notifications for students
  4. zoeker_settings - School-level configuration (optional)

  ## Security
  - Enable RLS on all tables
  - Students can only see their own data
  - Teachers can see data from their school's students
*/

-- Create zoeker_search_requests table
CREATE TABLE IF NOT EXISTS zoeker_search_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid REFERENCES students(id) ON DELETE CASCADE NOT NULL,
  school_id uuid REFERENCES schools(id) ON DELETE CASCADE NOT NULL,
  query text NOT NULL,
  target text NOT NULL CHECK (target IN ('youtube', 'google', 'images', 'schooltv', 'wikipedia', 'wikikids', 'prompt')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'needs_improvement', 'rejected')),
  teacher_feedback text,
  modified_query text,
  feedback_data jsonb DEFAULT '[]'::jsonb,
  reviewed_by uuid REFERENCES auth.users(id),
  reviewed_at timestamptz,
  student_opened boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE zoeker_search_requests ENABLE ROW LEVEL SECURITY;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_zoeker_requests_student_id ON zoeker_search_requests(student_id);
CREATE INDEX IF NOT EXISTS idx_zoeker_requests_school_id ON zoeker_search_requests(school_id);
CREATE INDEX IF NOT EXISTS idx_zoeker_requests_status ON zoeker_search_requests(status);
CREATE INDEX IF NOT EXISTS idx_zoeker_requests_created_at ON zoeker_search_requests(created_at DESC);

-- Create zoeker_search_history table
CREATE TABLE IF NOT EXISTS zoeker_search_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid REFERENCES students(id) ON DELETE CASCADE NOT NULL,
  school_id uuid REFERENCES schools(id) ON DELETE CASCADE NOT NULL,
  query text NOT NULL,
  target text NOT NULL,
  mode text NOT NULL DEFAULT 'free' CHECK (mode IN ('free', 'controlled', 'prompt')),
  feedback_data jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE zoeker_search_history ENABLE ROW LEVEL SECURITY;

-- Create indexes for history
CREATE INDEX IF NOT EXISTS idx_zoeker_history_student_id ON zoeker_search_history(student_id);
CREATE INDEX IF NOT EXISTS idx_zoeker_history_school_id ON zoeker_search_history(school_id);
CREATE INDEX IF NOT EXISTS idx_zoeker_history_created_at ON zoeker_search_history(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_zoeker_history_target ON zoeker_search_history(target);

-- Create zoeker_notifications table
CREATE TABLE IF NOT EXISTS zoeker_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid REFERENCES students(id) ON DELETE CASCADE NOT NULL,
  request_id uuid REFERENCES zoeker_search_requests(id) ON DELETE CASCADE,
  message text NOT NULL,
  read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE zoeker_notifications ENABLE ROW LEVEL SECURITY;

-- Create indexes for notifications
CREATE INDEX IF NOT EXISTS idx_zoeker_notif_student_id ON zoeker_notifications(student_id);
CREATE INDEX IF NOT EXISTS idx_zoeker_notif_read ON zoeker_notifications(read);
CREATE INDEX IF NOT EXISTS idx_zoeker_notif_created_at ON zoeker_notifications(created_at DESC);

-- Create zoeker_settings table (school-level configuration)
CREATE TABLE IF NOT EXISTS zoeker_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid REFERENCES schools(id) ON DELETE CASCADE NOT NULL UNIQUE,
  require_approval boolean DEFAULT true,
  allowed_targets text[] DEFAULT ARRAY['youtube', 'google', 'images', 'schooltv', 'wikipedia', 'wikikids', 'prompt'],
  max_daily_searches integer DEFAULT 50,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE zoeker_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for zoeker_search_requests

-- Students can view their own requests
CREATE POLICY "Students can view own requests"
  ON zoeker_search_requests FOR SELECT
  TO authenticated
  USING (
    student_id IN (
      SELECT id FROM students WHERE id = student_id
    )
  );

-- Students can insert their own requests
CREATE POLICY "Students can create requests"
  ON zoeker_search_requests FOR INSERT
  TO authenticated
  WITH CHECK (
    student_id IN (
      SELECT id FROM students WHERE id = student_id
    )
  );

-- Students can update their own requests (mark as opened)
CREATE POLICY "Students can update own requests"
  ON zoeker_search_requests FOR UPDATE
  TO authenticated
  USING (
    student_id IN (
      SELECT id FROM students WHERE id = student_id
    )
  )
  WITH CHECK (
    student_id IN (
      SELECT id FROM students WHERE id = student_id
    )
  );

-- Teachers can view requests from their schools
CREATE POLICY "Teachers can view school requests"
  ON zoeker_search_requests FOR SELECT
  TO authenticated
  USING (
    school_id IN (
      SELECT school_id FROM user_schools WHERE user_id = auth.uid()
    )
  );

-- Teachers can update requests from their schools
CREATE POLICY "Teachers can update school requests"
  ON zoeker_search_requests FOR UPDATE
  TO authenticated
  USING (
    school_id IN (
      SELECT school_id FROM user_schools WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    school_id IN (
      SELECT school_id FROM user_schools WHERE user_id = auth.uid()
    )
  );

-- RLS Policies for zoeker_search_history

-- Students can view their own history
CREATE POLICY "Students can view own history"
  ON zoeker_search_history FOR SELECT
  TO authenticated
  USING (
    student_id IN (
      SELECT id FROM students WHERE id = student_id
    )
  );

-- Students can insert their own history
CREATE POLICY "Students can create history"
  ON zoeker_search_history FOR INSERT
  TO authenticated
  WITH CHECK (
    student_id IN (
      SELECT id FROM students WHERE id = student_id
    )
  );

-- Teachers can view history from their schools
CREATE POLICY "Teachers can view school history"
  ON zoeker_search_history FOR SELECT
  TO authenticated
  USING (
    school_id IN (
      SELECT school_id FROM user_schools WHERE user_id = auth.uid()
    )
  );

-- RLS Policies for zoeker_notifications

-- Students can view their own notifications
CREATE POLICY "Students can view own notifications"
  ON zoeker_notifications FOR SELECT
  TO authenticated
  USING (
    student_id IN (
      SELECT id FROM students WHERE id = student_id
    )
  );

-- Students can update their own notifications (mark as read)
CREATE POLICY "Students can update own notifications"
  ON zoeker_notifications FOR UPDATE
  TO authenticated
  USING (
    student_id IN (
      SELECT id FROM students WHERE id = student_id
    )
  )
  WITH CHECK (
    student_id IN (
      SELECT id FROM students WHERE id = student_id
    )
  );

-- Teachers can create notifications for their school's students
CREATE POLICY "Teachers can create notifications"
  ON zoeker_notifications FOR INSERT
  TO authenticated
  WITH CHECK (
    student_id IN (
      SELECT s.id FROM students s
      INNER JOIN user_schools us ON s.school_id = us.school_id
      WHERE us.user_id = auth.uid()
    )
  );

-- RLS Policies for zoeker_settings

-- Teachers can view settings for their schools
CREATE POLICY "Teachers can view school settings"
  ON zoeker_settings FOR SELECT
  TO authenticated
  USING (
    school_id IN (
      SELECT school_id FROM user_schools WHERE user_id = auth.uid()
    )
  );

-- Teachers can insert settings for their schools
CREATE POLICY "Teachers can create school settings"
  ON zoeker_settings FOR INSERT
  TO authenticated
  WITH CHECK (
    school_id IN (
      SELECT school_id FROM user_schools WHERE user_id = auth.uid()
    )
  );

-- Teachers can update settings for their schools
CREATE POLICY "Teachers can update school settings"
  ON zoeker_settings FOR UPDATE
  TO authenticated
  USING (
    school_id IN (
      SELECT school_id FROM user_schools WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    school_id IN (
      SELECT school_id FROM user_schools WHERE user_id = auth.uid()
    )
  );

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_zoeker_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_zoeker_requests_updated_at
  BEFORE UPDATE ON zoeker_search_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_zoeker_updated_at();

CREATE TRIGGER update_zoeker_settings_updated_at
  BEFORE UPDATE ON zoeker_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_zoeker_updated_at();
