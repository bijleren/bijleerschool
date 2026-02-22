/*
  # Add Sporen (Track/Level) Management System

  ## Overview
  This migration creates a comprehensive system for managing "sporen" (tracks/levels) in schools,
  allowing teachers to organize students by ability level within subjects and maintain notes
  for each classroom-subject-spoor combination.

  ## New Tables
  
  ### 1. `sporen`
  Core table for track/level definitions per school
  - `id` (uuid, primary key) - Unique identifier
  - `school_id` (uuid, foreign key) - Links to schools table
  - `name` (text) - Name of the spoor (e.g., "Basis", "Verdieping", "Uitdaging")
  - `color` (text) - Hex color code for visual identification
  - `icon` (text) - Lucide icon name
  - `sort_order` (integer) - Display order
  - `is_active` (boolean) - Whether spoor is currently in use
  - `created_at` (timestamptz) - Creation timestamp
  - `updated_at` (timestamptz) - Last update timestamp

  ### 2. `spoor_subject_links`
  Junction table linking sporen to specific subjects
  - `id` (uuid, primary key) - Unique identifier
  - `spoor_id` (uuid, foreign key) - Links to sporen table
  - `school_subject_id` (uuid, foreign key) - Links to school_subjects table
  - `created_at` (timestamptz) - Creation timestamp

  ### 3. `student_spoor_assignments`
  Tracks current and historical student assignments to sporen
  - `id` (uuid, primary key) - Unique identifier
  - `student_id` (uuid, foreign key) - Links to students table
  - `group_id` (uuid, foreign key) - Links to groups table (classroom)
  - `school_subject_id` (uuid, foreign key) - Links to school_subjects table
  - `spoor_id` (uuid, foreign key) - Links to sporen table
  - `assigned_at` (timestamptz) - When assignment was made
  - `assigned_by` (uuid, foreign key) - User who made the assignment
  - `is_current` (boolean) - Whether this is the active assignment
  - `created_at` (timestamptz) - Record creation timestamp

  ### 4. `spoor_notes`
  Stores notes for each classroom-subject-spoor combination
  - `id` (uuid, primary key) - Unique identifier
  - `group_id` (uuid, foreign key) - Links to groups table (classroom)
  - `school_subject_id` (uuid, foreign key) - Links to school_subjects table
  - `spoor_id` (uuid, foreign key) - Links to sporen table
  - `notes_text` (text) - The actual notes content
  - `created_by_user_id` (uuid, foreign key) - User who created the note
  - `created_at` (timestamptz) - Creation timestamp
  - `updated_at` (timestamptz) - Last update timestamp

  ## Indexes
  - Composite unique index on student_spoor_assignments (student_id, group_id, school_subject_id) where is_current = true
  - Composite unique index on spoor_notes (group_id, school_subject_id, spoor_id)
  - Performance indexes on foreign keys and frequently queried columns

  ## Security
  - Enable RLS on all tables
  - Users can only access sporen for schools they have approved access to
  - Users can only modify assignments and notes for their approved schools
*/

-- Create sporen table
CREATE TABLE IF NOT EXISTS sporen (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  name text NOT NULL,
  color text NOT NULL DEFAULT '#3b82f6',
  icon text NOT NULL DEFAULT 'GraduationCap',
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create spoor_subject_links table
CREATE TABLE IF NOT EXISTS spoor_subject_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  spoor_id uuid NOT NULL REFERENCES sporen(id) ON DELETE CASCADE,
  school_subject_id uuid NOT NULL REFERENCES school_subjects(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(spoor_id, school_subject_id)
);

-- Create student_spoor_assignments table
CREATE TABLE IF NOT EXISTS student_spoor_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  group_id uuid NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  school_subject_id uuid NOT NULL REFERENCES school_subjects(id) ON DELETE CASCADE,
  spoor_id uuid NOT NULL REFERENCES sporen(id) ON DELETE CASCADE,
  assigned_at timestamptz NOT NULL DEFAULT now(),
  assigned_by uuid REFERENCES auth.users(id),
  is_current boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Create spoor_notes table
CREATE TABLE IF NOT EXISTS spoor_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  school_subject_id uuid NOT NULL REFERENCES school_subjects(id) ON DELETE CASCADE,
  spoor_id uuid NOT NULL REFERENCES sporen(id) ON DELETE CASCADE,
  notes_text text NOT NULL DEFAULT '',
  created_by_user_id uuid NOT NULL REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(group_id, school_subject_id, spoor_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_sporen_school_id ON sporen(school_id);
CREATE INDEX IF NOT EXISTS idx_sporen_is_active ON sporen(is_active);
CREATE INDEX IF NOT EXISTS idx_spoor_subject_links_spoor_id ON spoor_subject_links(spoor_id);
CREATE INDEX IF NOT EXISTS idx_spoor_subject_links_subject_id ON spoor_subject_links(school_subject_id);
CREATE INDEX IF NOT EXISTS idx_student_spoor_assignments_student_id ON student_spoor_assignments(student_id);
CREATE INDEX IF NOT EXISTS idx_student_spoor_assignments_group_id ON student_spoor_assignments(group_id);
CREATE INDEX IF NOT EXISTS idx_student_spoor_assignments_is_current ON student_spoor_assignments(is_current);
CREATE INDEX IF NOT EXISTS idx_spoor_notes_group_subject ON spoor_notes(group_id, school_subject_id);

-- Create unique index to prevent duplicate active assignments
CREATE UNIQUE INDEX IF NOT EXISTS idx_student_spoor_current_unique 
ON student_spoor_assignments(student_id, group_id, school_subject_id) 
WHERE is_current = true;

-- Enable Row Level Security
ALTER TABLE sporen ENABLE ROW LEVEL SECURITY;
ALTER TABLE spoor_subject_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_spoor_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE spoor_notes ENABLE ROW LEVEL SECURITY;

-- RLS Policies for sporen table
CREATE POLICY "Users can view sporen from their schools"
  ON sporen FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_schools
      WHERE user_schools.school_id = sporen.school_id
      AND user_schools.user_id = auth.uid()
      AND user_schools.is_active = true
      AND user_schools.status = 'approved'
    )
  );

CREATE POLICY "Users can insert sporen for their schools"
  ON sporen FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_schools
      WHERE user_schools.school_id = sporen.school_id
      AND user_schools.user_id = auth.uid()
      AND user_schools.is_active = true
      AND user_schools.status = 'approved'
    )
  );

CREATE POLICY "Users can update sporen for their schools"
  ON sporen FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_schools
      WHERE user_schools.school_id = sporen.school_id
      AND user_schools.user_id = auth.uid()
      AND user_schools.is_active = true
      AND user_schools.status = 'approved'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_schools
      WHERE user_schools.school_id = sporen.school_id
      AND user_schools.user_id = auth.uid()
      AND user_schools.is_active = true
      AND user_schools.status = 'approved'
    )
  );

CREATE POLICY "Users can delete sporen for their schools"
  ON sporen FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_schools
      WHERE user_schools.school_id = sporen.school_id
      AND user_schools.user_id = auth.uid()
      AND user_schools.is_active = true
      AND user_schools.status = 'approved'
    )
  );

-- RLS Policies for spoor_subject_links table
CREATE POLICY "Users can view spoor subject links from their schools"
  ON spoor_subject_links FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM sporen
      JOIN user_schools ON user_schools.school_id = sporen.school_id
      WHERE sporen.id = spoor_subject_links.spoor_id
      AND user_schools.user_id = auth.uid()
      AND user_schools.is_active = true
      AND user_schools.status = 'approved'
    )
  );

CREATE POLICY "Users can insert spoor subject links for their schools"
  ON spoor_subject_links FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM sporen
      JOIN user_schools ON user_schools.school_id = sporen.school_id
      WHERE sporen.id = spoor_subject_links.spoor_id
      AND user_schools.user_id = auth.uid()
      AND user_schools.is_active = true
      AND user_schools.status = 'approved'
    )
  );

CREATE POLICY "Users can update spoor subject links for their schools"
  ON spoor_subject_links FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM sporen
      JOIN user_schools ON user_schools.school_id = sporen.school_id
      WHERE sporen.id = spoor_subject_links.spoor_id
      AND user_schools.user_id = auth.uid()
      AND user_schools.is_active = true
      AND user_schools.status = 'approved'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM sporen
      JOIN user_schools ON user_schools.school_id = sporen.school_id
      WHERE sporen.id = spoor_subject_links.spoor_id
      AND user_schools.user_id = auth.uid()
      AND user_schools.is_active = true
      AND user_schools.status = 'approved'
    )
  );

CREATE POLICY "Users can delete spoor subject links for their schools"
  ON spoor_subject_links FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM sporen
      JOIN user_schools ON user_schools.school_id = sporen.school_id
      WHERE sporen.id = spoor_subject_links.spoor_id
      AND user_schools.user_id = auth.uid()
      AND user_schools.is_active = true
      AND user_schools.status = 'approved'
    )
  );

-- RLS Policies for student_spoor_assignments table
CREATE POLICY "Users can view assignments from their schools"
  ON student_spoor_assignments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM students
      JOIN user_schools ON user_schools.school_id = students.school_id
      WHERE students.id = student_spoor_assignments.student_id
      AND user_schools.user_id = auth.uid()
      AND user_schools.is_active = true
      AND user_schools.status = 'approved'
    )
  );

CREATE POLICY "Users can insert assignments for their schools"
  ON student_spoor_assignments FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM students
      JOIN user_schools ON user_schools.school_id = students.school_id
      WHERE students.id = student_spoor_assignments.student_id
      AND user_schools.user_id = auth.uid()
      AND user_schools.is_active = true
      AND user_schools.status = 'approved'
    )
  );

CREATE POLICY "Users can update assignments for their schools"
  ON student_spoor_assignments FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM students
      JOIN user_schools ON user_schools.school_id = students.school_id
      WHERE students.id = student_spoor_assignments.student_id
      AND user_schools.user_id = auth.uid()
      AND user_schools.is_active = true
      AND user_schools.status = 'approved'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM students
      JOIN user_schools ON user_schools.school_id = students.school_id
      WHERE students.id = student_spoor_assignments.student_id
      AND user_schools.user_id = auth.uid()
      AND user_schools.is_active = true
      AND user_schools.status = 'approved'
    )
  );

CREATE POLICY "Users can delete assignments for their schools"
  ON student_spoor_assignments FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM students
      JOIN user_schools ON user_schools.school_id = students.school_id
      WHERE students.id = student_spoor_assignments.student_id
      AND user_schools.user_id = auth.uid()
      AND user_schools.is_active = true
      AND user_schools.status = 'approved'
    )
  );

-- RLS Policies for spoor_notes table
CREATE POLICY "Users can view notes from their schools"
  ON spoor_notes FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM groups
      JOIN user_schools ON user_schools.school_id = groups.school_id
      WHERE groups.id = spoor_notes.group_id
      AND user_schools.user_id = auth.uid()
      AND user_schools.is_active = true
      AND user_schools.status = 'approved'
    )
  );

CREATE POLICY "Users can insert notes for their schools"
  ON spoor_notes FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM groups
      JOIN user_schools ON user_schools.school_id = groups.school_id
      WHERE groups.id = spoor_notes.group_id
      AND user_schools.user_id = auth.uid()
      AND user_schools.is_active = true
      AND user_schools.status = 'approved'
    )
  );

CREATE POLICY "Users can update notes for their schools"
  ON spoor_notes FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM groups
      JOIN user_schools ON user_schools.school_id = groups.school_id
      WHERE groups.id = spoor_notes.group_id
      AND user_schools.user_id = auth.uid()
      AND user_schools.is_active = true
      AND user_schools.status = 'approved'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM groups
      JOIN user_schools ON user_schools.school_id = groups.school_id
      WHERE groups.id = spoor_notes.group_id
      AND user_schools.user_id = auth.uid()
      AND user_schools.is_active = true
      AND user_schools.status = 'approved'
    )
  );

CREATE POLICY "Users can delete notes for their schools"
  ON spoor_notes FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM groups
      JOIN user_schools ON user_schools.school_id = groups.school_id
      WHERE groups.id = spoor_notes.group_id
      AND user_schools.user_id = auth.uid()
      AND user_schools.is_active = true
      AND user_schools.status = 'approved'
    )
  );