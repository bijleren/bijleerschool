/*
  # BijleerSchool Database Schema

  ## Overview
  Complete database structure for BijleerSchool - an educational toolkit platform where teachers can manage didactic techniques, plan timelines, and track student behavior.

  ## 1. New Tables
  
  ### Core Tables
  - `profiles` - Extended user profiles linked to Supabase auth
  - `schools` - Educational institutions with unique access codes
  - `teachers` - Teacher profiles with school associations
  - `students` - Student profiles for future student platform
  - `groups` - Collections of teachers and students within schools
  
  ### Relationship Tables
  - `user_schools` - Many-to-many relationship between users and schools
  - `teacher_groups` - Teachers assigned to specific groups
  - `student_groups` - Students assigned to specific groups

  ## 2. Security
  - Enable RLS on all tables
  - Users can only access data from schools they belong to
  - Teachers can only see students/groups from their schools
  - Safe deletion policies with validation

  ## 3. Key Features
  - Multi-school support for users
  - Unique school codes for teacher registration
  - Proper data isolation between schools
  - Extensible structure for future didactic tools and timelines
*/

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Profiles table (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text UNIQUE NOT NULL,
  first_name text NOT NULL,
  last_name text NOT NULL,
  avatar_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Schools table
CREATE TABLE IF NOT EXISTS schools (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  school_code text UNIQUE NOT NULL,
  address text,
  city text,
  postal_code text,
  country text DEFAULT 'Netherlands',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Teachers table
CREATE TABLE IF NOT EXISTS teachers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  employee_number text,
  subject_specialization text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Students table (for future student platform)
CREATE TABLE IF NOT EXISTS students (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  first_name text NOT NULL,
  last_name text NOT NULL,
  student_number text,
  date_of_birth date,
  grade_level text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(school_id, student_number)
);

-- Groups table
CREATE TABLE IF NOT EXISTS groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  grade_level text,
  school_year text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(school_id, name, school_year)
);

-- User-School relationships (many-to-many)
CREATE TABLE IF NOT EXISTS user_schools (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  school_id uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'teacher' CHECK (role IN ('teacher', 'admin')),
  joined_at timestamptz DEFAULT now(),
  is_active boolean DEFAULT true,
  UNIQUE(user_id, school_id)
);

-- Teacher-Group relationships
CREATE TABLE IF NOT EXISTS teacher_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id uuid NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
  group_id uuid NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  role text DEFAULT 'teacher' CHECK (role IN ('teacher', 'lead_teacher')),
  assigned_at timestamptz DEFAULT now(),
  UNIQUE(teacher_id, group_id)
);

-- Student-Group relationships
CREATE TABLE IF NOT EXISTS student_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  group_id uuid NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  enrolled_at timestamptz DEFAULT now(),
  is_active boolean DEFAULT true,
  UNIQUE(student_id, group_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
CREATE INDEX IF NOT EXISTS idx_schools_code ON schools(school_code);
CREATE INDEX IF NOT EXISTS idx_teachers_user_id ON teachers(user_id);
CREATE INDEX IF NOT EXISTS idx_students_school_id ON students(school_id);
CREATE INDEX IF NOT EXISTS idx_groups_school_id ON groups(school_id);
CREATE INDEX IF NOT EXISTS idx_user_schools_user_id ON user_schools(user_id);
CREATE INDEX IF NOT EXISTS idx_user_schools_school_id ON user_schools(school_id);
CREATE INDEX IF NOT EXISTS idx_teacher_groups_teacher_id ON teacher_groups(teacher_id);
CREATE INDEX IF NOT EXISTS idx_teacher_groups_group_id ON teacher_groups(group_id);
CREATE INDEX IF NOT EXISTS idx_student_groups_student_id ON student_groups(student_id);
CREATE INDEX IF NOT EXISTS idx_student_groups_group_id ON student_groups(group_id);

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE schools ENABLE ROW LEVEL SECURITY;
ALTER TABLE teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_schools ENABLE ROW LEVEL SECURITY;
ALTER TABLE teacher_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_groups ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
CREATE POLICY "Users can read own profile"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- RLS Policies for schools
CREATE POLICY "Users can read schools they belong to"
  ON schools
  FOR SELECT
  TO authenticated
  USING (
    id IN (
      SELECT school_id FROM user_schools 
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

-- RLS Policies for teachers
CREATE POLICY "Users can read teachers from their schools"
  ON teachers
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_schools us
      JOIN teacher_groups tg ON tg.teacher_id = teachers.id
      JOIN groups g ON g.id = tg.group_id
      WHERE us.user_id = auth.uid() 
      AND us.school_id = g.school_id 
      AND us.is_active = true
    )
    OR user_id = auth.uid()
  );

CREATE POLICY "Users can insert own teacher profile"
  ON teachers
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own teacher profile"
  ON teachers
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

-- RLS Policies for students
CREATE POLICY "Teachers can read students from their schools"
  ON students
  FOR SELECT
  TO authenticated
  USING (
    school_id IN (
      SELECT school_id FROM user_schools 
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

CREATE POLICY "Teachers can manage students in their schools"
  ON students
  FOR ALL
  TO authenticated
  USING (
    school_id IN (
      SELECT school_id FROM user_schools 
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

-- RLS Policies for groups
CREATE POLICY "Users can read groups from their schools"
  ON groups
  FOR SELECT
  TO authenticated
  USING (
    school_id IN (
      SELECT school_id FROM user_schools 
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

CREATE POLICY "Users can manage groups in their schools"
  ON groups
  FOR ALL
  TO authenticated
  USING (
    school_id IN (
      SELECT school_id FROM user_schools 
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

-- RLS Policies for user_schools
CREATE POLICY "Users can read their own school relationships"
  ON user_schools
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own school relationships"
  ON user_schools
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- RLS Policies for teacher_groups
CREATE POLICY "Users can read teacher-group relationships from their schools"
  ON teacher_groups
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM teachers t
      JOIN user_schools us ON us.user_id = t.user_id
      JOIN groups g ON g.id = teacher_groups.group_id
      WHERE us.school_id = g.school_id 
      AND us.user_id = auth.uid() 
      AND us.is_active = true
    )
  );

-- RLS Policies for student_groups
CREATE POLICY "Users can read student-group relationships from their schools"
  ON student_groups
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM groups g
      JOIN user_schools us ON us.school_id = g.school_id
      WHERE g.id = student_groups.group_id 
      AND us.user_id = auth.uid() 
      AND us.is_active = true
    )
  );

-- Function to generate unique school codes
CREATE OR REPLACE FUNCTION generate_school_code()
RETURNS text AS $$
DECLARE
  code text;
  exists boolean;
BEGIN
  LOOP
    -- Generate a 6-character alphanumeric code
    code := upper(substring(md5(random()::text) from 1 for 6));
    
    -- Check if code already exists
    SELECT EXISTS(SELECT 1 FROM schools WHERE school_code = code) INTO exists;
    
    -- If code doesn't exist, return it
    IF NOT exists THEN
      RETURN code;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Function to handle user registration and profile creation
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO profiles (id, email, first_name, last_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'last_name', '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to automatically create profile when user signs up
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add updated_at triggers to relevant tables
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_schools_updated_at
  BEFORE UPDATE ON schools
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_teachers_updated_at
  BEFORE UPDATE ON teachers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_students_updated_at
  BEFORE UPDATE ON students
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_groups_updated_at
  BEFORE UPDATE ON groups
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();