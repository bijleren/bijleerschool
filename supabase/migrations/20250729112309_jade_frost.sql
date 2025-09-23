/*
  # Create teaching feature tables

  1. New Tables
    - `age_groups`
      - `id` (uuid, primary key)
      - `name` (text, unique)
      - `description` (text, optional)
      - `sort_order` (integer)
      - `is_active` (boolean, default true)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
    
    - `subjects`
      - `id` (uuid, primary key)
      - `name` (text, unique)
      - `description` (text, optional)
      - `sort_order` (integer)
      - `is_active` (boolean, default true)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
    
    - `materials`
      - `id` (uuid, primary key)
      - `name` (text, unique)
      - `description` (text, optional)
      - `sort_order` (integer)
      - `is_active` (boolean, default true)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
    
    - `teaching_techniques`
      - `id` (uuid, primary key)
      - `title` (text)
      - `subtitle` (text, optional)
      - `description` (text)
      - `student_video_url` (text, optional)
      - `teacher_video_url` (text, optional)
      - `external_links` (jsonb, optional)
      - `created_by` (uuid, references profiles)
      - `is_active` (boolean, default true)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
    
    - `teaching_technique_age_groups` (junction table)
      - `id` (uuid, primary key)
      - `technique_id` (uuid, references teaching_techniques)
      - `age_group_id` (uuid, references age_groups)
      - `created_at` (timestamp)
    
    - `teaching_technique_subjects` (junction table)
      - `id` (uuid, primary key)
      - `technique_id` (uuid, references teaching_techniques)
      - `subject_id` (uuid, references subjects)
      - `created_at` (timestamp)
    
    - `teaching_technique_materials` (junction table)
      - `id` (uuid, primary key)
      - `technique_id` (uuid, references teaching_techniques)
      - `material_id` (uuid, references materials)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users to read all data
    - Add policies for authenticated users to manage their own techniques
    - Add policies for authenticated users to manage reference data
*/

-- Create age_groups table
CREATE TABLE IF NOT EXISTS age_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  description text,
  sort_order integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create subjects table
CREATE TABLE IF NOT EXISTS subjects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  description text,
  sort_order integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create materials table
CREATE TABLE IF NOT EXISTS materials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  description text,
  sort_order integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create teaching_techniques table
CREATE TABLE IF NOT EXISTS teaching_techniques (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  subtitle text,
  description text NOT NULL,
  student_video_url text,
  teacher_video_url text,
  external_links jsonb,
  created_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create junction tables
CREATE TABLE IF NOT EXISTS teaching_technique_age_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  technique_id uuid REFERENCES teaching_techniques(id) ON DELETE CASCADE,
  age_group_id uuid REFERENCES age_groups(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(technique_id, age_group_id)
);

CREATE TABLE IF NOT EXISTS teaching_technique_subjects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  technique_id uuid REFERENCES teaching_techniques(id) ON DELETE CASCADE,
  subject_id uuid REFERENCES subjects(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(technique_id, subject_id)
);

CREATE TABLE IF NOT EXISTS teaching_technique_materials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  technique_id uuid REFERENCES teaching_techniques(id) ON DELETE CASCADE,
  material_id uuid REFERENCES materials(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(technique_id, material_id)
);

-- Enable RLS
ALTER TABLE age_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE teaching_techniques ENABLE ROW LEVEL SECURITY;
ALTER TABLE teaching_technique_age_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE teaching_technique_subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE teaching_technique_materials ENABLE ROW LEVEL SECURITY;

-- Create policies for age_groups
CREATE POLICY "Anyone can read age groups"
  ON age_groups
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can manage age groups"
  ON age_groups
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Create policies for subjects
CREATE POLICY "Anyone can read subjects"
  ON subjects
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can manage subjects"
  ON subjects
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Create policies for materials
CREATE POLICY "Anyone can read materials"
  ON materials
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can manage materials"
  ON materials
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Create policies for teaching_techniques
CREATE POLICY "Anyone can read teaching techniques"
  ON teaching_techniques
  FOR SELECT
  TO authenticated
  USING (is_active = true);

CREATE POLICY "Users can create teaching techniques"
  ON teaching_techniques
  FOR INSERT
  TO authenticated
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Users can update own teaching techniques"
  ON teaching_techniques
  FOR UPDATE
  TO authenticated
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Users can delete own teaching techniques"
  ON teaching_techniques
  FOR DELETE
  TO authenticated
  USING (created_by = auth.uid());

-- Create policies for junction tables
CREATE POLICY "Anyone can read technique age groups"
  ON teaching_technique_age_groups
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can manage technique age groups"
  ON teaching_technique_age_groups
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anyone can read technique subjects"
  ON teaching_technique_subjects
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can manage technique subjects"
  ON teaching_technique_subjects
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anyone can read technique materials"
  ON teaching_technique_materials
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can manage technique materials"
  ON teaching_technique_materials
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_age_groups_active ON age_groups(is_active, sort_order);
CREATE INDEX IF NOT EXISTS idx_subjects_active ON subjects(is_active, sort_order);
CREATE INDEX IF NOT EXISTS idx_materials_active ON materials(is_active, sort_order);
CREATE INDEX IF NOT EXISTS idx_teaching_techniques_active ON teaching_techniques(is_active, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_teaching_techniques_created_by ON teaching_techniques(created_by);

-- Create triggers for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_age_groups_updated_at
    BEFORE UPDATE ON age_groups
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_subjects_updated_at
    BEFORE UPDATE ON subjects
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_materials_updated_at
    BEFORE UPDATE ON materials
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_teaching_techniques_updated_at
    BEFORE UPDATE ON teaching_techniques
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Insert some default data
INSERT INTO age_groups (name, description, sort_order) VALUES
  ('Basisonderwijs', 'Groep 1-8 (4-12 jaar)', 1),
  ('Voortgezet onderwijs', 'Middelbare school (12-18 jaar)', 2),
  ('MBO', 'Middelbaar beroepsonderwijs (16-25 jaar)', 3),
  ('HBO/WO', 'Hoger onderwijs (18+ jaar)', 4)
ON CONFLICT (name) DO NOTHING;

INSERT INTO subjects (name, description, sort_order) VALUES
  ('Nederlands', 'Nederlandse taal en literatuur', 1),
  ('Wiskunde', 'Rekenen en wiskunde', 2),
  ('Engels', 'Engelse taal', 3),
  ('Geschiedenis', 'Geschiedenis en maatschappijleer', 4),
  ('Aardrijkskunde', 'Geografie en topografie', 5),
  ('Biologie', 'Natuurkunde en biologie', 6),
  ('Scheikunde', 'Scheikunde en natuurwetenschappen', 7),
  ('Natuurkunde', 'Fysica en natuurkunde', 8),
  ('Kunst', 'Beeldende vorming en kunst', 9),
  ('Muziek', 'Muziekonderwijs', 10),
  ('Lichamelijke opvoeding', 'Sport en beweging', 11),
  ('Algemeen', 'Algemene didactiek', 12)
ON CONFLICT (name) DO NOTHING;

INSERT INTO materials (name, description, sort_order) VALUES
  ('Whiteboard', 'Digitaal of analoog whiteboard', 1),
  ('Laptop/Computer', 'Digitale apparatuur', 2),
  ('Tablet', 'Mobiele apparaten', 3),
  ('Beamer/Projector', 'Presentatie apparatuur', 4),
  ('Werkbladen', 'Papieren materialen', 5),
  ('Boeken', 'Leerboeken en naslagwerken', 6),
  ('Spelmateriaal', 'Educatieve spellen', 7),
  ('Knutselmateriaal', 'Creatieve materialen', 8),
  ('Meetinstrumenten', 'Linialen, kompassen, etc.', 9),
  ('Geen materiaal', 'Alleen mondeling/discussie', 10)
ON CONFLICT (name) DO NOTHING;