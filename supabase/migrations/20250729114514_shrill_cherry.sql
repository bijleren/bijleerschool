/*
  # Add usage tracking, coaching system, and comments for teaching techniques

  1. New Tables
    - `technique_usage_logs`
      - `id` (uuid, primary key)
      - `technique_id` (uuid, references teaching_techniques)
      - `user_id` (uuid, references profiles)
      - `group_id` (uuid, optional, references groups)
      - `used_at` (timestamp)
      - `notes` (text, optional)
      - `created_at` (timestamp)

    - `technique_coaches`
      - `id` (uuid, primary key)
      - `technique_id` (uuid, references teaching_techniques)
      - `user_id` (uuid, references profiles)
      - `school_id` (uuid, references schools)
      - `experience_level` (text: beginner, intermediate, expert)
      - `description` (text, optional)
      - `is_active` (boolean)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

    - `technique_comments`
      - `id` (uuid, primary key)
      - `technique_id` (uuid, references teaching_techniques)
      - `user_id` (uuid, references profiles)
      - `school_id` (uuid, references schools)
      - `comment` (text)
      - `is_active` (boolean)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users based on school membership
*/

-- Create technique_usage_logs table
CREATE TABLE IF NOT EXISTS technique_usage_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  technique_id uuid NOT NULL REFERENCES teaching_techniques(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  group_id uuid REFERENCES groups(id) ON DELETE SET NULL,
  used_at timestamptz NOT NULL DEFAULT now(),
  notes text,
  created_at timestamptz DEFAULT now()
);

-- Create technique_coaches table
CREATE TABLE IF NOT EXISTS technique_coaches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  technique_id uuid NOT NULL REFERENCES teaching_techniques(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  school_id uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  experience_level text NOT NULL DEFAULT 'intermediate' CHECK (experience_level IN ('beginner', 'intermediate', 'expert')),
  description text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(technique_id, user_id, school_id)
);

-- Create technique_comments table
CREATE TABLE IF NOT EXISTS technique_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  technique_id uuid NOT NULL REFERENCES teaching_techniques(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  school_id uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  comment text NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_technique_usage_logs_technique_id ON technique_usage_logs(technique_id);
CREATE INDEX IF NOT EXISTS idx_technique_usage_logs_user_id ON technique_usage_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_technique_usage_logs_used_at ON technique_usage_logs(used_at DESC);

CREATE INDEX IF NOT EXISTS idx_technique_coaches_technique_id ON technique_coaches(technique_id);
CREATE INDEX IF NOT EXISTS idx_technique_coaches_school_id ON technique_coaches(school_id);
CREATE INDEX IF NOT EXISTS idx_technique_coaches_active ON technique_coaches(technique_id, school_id, is_active) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_technique_comments_technique_id ON technique_comments(technique_id);
CREATE INDEX IF NOT EXISTS idx_technique_comments_school_id ON technique_comments(school_id);
CREATE INDEX IF NOT EXISTS idx_technique_comments_active ON technique_comments(technique_id, school_id, is_active, created_at DESC) WHERE is_active = true;

-- Enable Row Level Security
ALTER TABLE technique_usage_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE technique_coaches ENABLE ROW LEVEL SECURITY;
ALTER TABLE technique_comments ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for technique_usage_logs
CREATE POLICY "Users can insert own usage logs"
  ON technique_usage_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can read usage logs for techniques"
  ON technique_usage_logs
  FOR SELECT
  TO authenticated
  USING (true);

-- Create RLS policies for technique_coaches
CREATE POLICY "Users can manage own coach status"
  ON technique_coaches
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Anyone can read active coaches"
  ON technique_coaches
  FOR SELECT
  TO authenticated
  USING (is_active = true);

-- Create RLS policies for technique_comments
CREATE POLICY "Users can insert own comments"
  ON technique_comments
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can read comments for their schools"
  ON technique_comments
  FOR SELECT
  TO authenticated
  USING (
    is_active = true AND
    school_id IN (
      SELECT school_id FROM user_schools 
      WHERE user_id = auth.uid() 
      AND status = 'approved' 
      AND is_active = true
    )
  );

CREATE POLICY "Users can update own comments"
  ON technique_comments
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own comments"
  ON technique_comments
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Create updated_at triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_technique_coaches_updated_at
    BEFORE UPDATE ON technique_coaches
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_technique_comments_updated_at
    BEFORE UPDATE ON technique_comments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();