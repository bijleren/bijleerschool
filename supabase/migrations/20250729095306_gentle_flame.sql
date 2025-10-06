/*
  # Create behavior incident management system

  1. New Tables
    - `behavior_categories`
      - `id` (uuid, primary key)
      - `school_id` (uuid, foreign key to schools)
      - `name` (text)
      - `description` (text, optional)
      - `color` (text, for UI display)
      - `is_active` (boolean)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

    - `behavior_severity_levels`
      - `id` (uuid, primary key)
      - `school_id` (uuid, foreign key to schools)
      - `name` (text)
      - `level` (integer, 1-5 scale)
      - `color` (text, for UI display)
      - `description` (text, optional)
      - `is_active` (boolean)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

    - `behavior_items`
      - `id` (uuid, primary key)
      - `school_id` (uuid, foreign key to schools)
      - `category_id` (uuid, foreign key to behavior_categories)
      - `severity_level_id` (uuid, foreign key to behavior_severity_levels)
      - `name` (text)
      - `description` (text, optional)
      - `is_active` (boolean)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

    - `behavior_incidents`
      - `id` (uuid, primary key)
      - `school_id` (uuid, foreign key to schools)
      - `student_id` (uuid, foreign key to students)
      - `behavior_item_id` (uuid, foreign key to behavior_items)
      - `reported_by` (uuid, foreign key to profiles)
      - `incident_date` (timestamp)
      - `location` (text, optional)
      - `description` (text)
      - `action_taken` (text, optional)
      - `follow_up_required` (boolean)
      - `follow_up_date` (timestamp, optional)
      - `follow_up_notes` (text, optional)
      - `status` (text, enum: pending, in_progress, resolved)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on all tables
    - Add policies for school members to manage their school's behavior data
*/

-- Create behavior_categories table
CREATE TABLE IF NOT EXISTS behavior_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  color text DEFAULT '#6B7280',
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(school_id, name)
);

ALTER TABLE behavior_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "School members can manage behavior categories"
  ON behavior_categories
  FOR ALL
  TO authenticated
  USING (
    school_id IN (
      SELECT user_schools.school_id
      FROM user_schools
      WHERE user_schools.user_id = auth.uid()
        AND user_schools.status = 'approved'
        AND user_schools.is_active = true
    )
  )
  WITH CHECK (
    school_id IN (
      SELECT user_schools.school_id
      FROM user_schools
      WHERE user_schools.user_id = auth.uid()
        AND user_schools.status = 'approved'
        AND user_schools.is_active = true
    )
  );

-- Create behavior_severity_levels table
CREATE TABLE IF NOT EXISTS behavior_severity_levels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  name text NOT NULL,
  level integer NOT NULL CHECK (level >= 1 AND level <= 5),
  color text DEFAULT '#6B7280',
  description text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(school_id, name),
  UNIQUE(school_id, level)
);

ALTER TABLE behavior_severity_levels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "School members can manage severity levels"
  ON behavior_severity_levels
  FOR ALL
  TO authenticated
  USING (
    school_id IN (
      SELECT user_schools.school_id
      FROM user_schools
      WHERE user_schools.user_id = auth.uid()
        AND user_schools.status = 'approved'
        AND user_schools.is_active = true
    )
  )
  WITH CHECK (
    school_id IN (
      SELECT user_schools.school_id
      FROM user_schools
      WHERE user_schools.user_id = auth.uid()
        AND user_schools.status = 'approved'
        AND user_schools.is_active = true
    )
  );

-- Create behavior_items table
CREATE TABLE IF NOT EXISTS behavior_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  category_id uuid NOT NULL REFERENCES behavior_categories(id) ON DELETE CASCADE,
  severity_level_id uuid NOT NULL REFERENCES behavior_severity_levels(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(school_id, name)
);

ALTER TABLE behavior_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "School members can manage behavior items"
  ON behavior_items
  FOR ALL
  TO authenticated
  USING (
    school_id IN (
      SELECT user_schools.school_id
      FROM user_schools
      WHERE user_schools.user_id = auth.uid()
        AND user_schools.status = 'approved'
        AND user_schools.is_active = true
    )
  )
  WITH CHECK (
    school_id IN (
      SELECT user_schools.school_id
      FROM user_schools
      WHERE user_schools.user_id = auth.uid()
        AND user_schools.status = 'approved'
        AND user_schools.is_active = true
    )
  );

-- Create behavior_incidents table
CREATE TABLE IF NOT EXISTS behavior_incidents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  behavior_item_id uuid NOT NULL REFERENCES behavior_items(id) ON DELETE CASCADE,
  reported_by uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  incident_date timestamptz NOT NULL DEFAULT now(),
  location text,
  description text NOT NULL,
  action_taken text,
  follow_up_required boolean DEFAULT false,
  follow_up_date timestamptz,
  follow_up_notes text,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'resolved')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE behavior_incidents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "School members can manage behavior incidents"
  ON behavior_incidents
  FOR ALL
  TO authenticated
  USING (
    school_id IN (
      SELECT user_schools.school_id
      FROM user_schools
      WHERE user_schools.user_id = auth.uid()
        AND user_schools.status = 'approved'
        AND user_schools.is_active = true
    )
  )
  WITH CHECK (
    school_id IN (
      SELECT user_schools.school_id
      FROM user_schools
      WHERE user_schools.user_id = auth.uid()
        AND user_schools.status = 'approved'
        AND user_schools.is_active = true
    )
  );

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_behavior_categories_school_id ON behavior_categories(school_id);
CREATE INDEX IF NOT EXISTS idx_behavior_severity_levels_school_id ON behavior_severity_levels(school_id);
CREATE INDEX IF NOT EXISTS idx_behavior_items_school_id ON behavior_items(school_id);
CREATE INDEX IF NOT EXISTS idx_behavior_items_category_id ON behavior_items(category_id);
CREATE INDEX IF NOT EXISTS idx_behavior_items_severity_level_id ON behavior_items(severity_level_id);
CREATE INDEX IF NOT EXISTS idx_behavior_incidents_school_id ON behavior_incidents(school_id);
CREATE INDEX IF NOT EXISTS idx_behavior_incidents_student_id ON behavior_incidents(student_id);
CREATE INDEX IF NOT EXISTS idx_behavior_incidents_behavior_item_id ON behavior_incidents(behavior_item_id);
CREATE INDEX IF NOT EXISTS idx_behavior_incidents_reported_by ON behavior_incidents(reported_by);
CREATE INDEX IF NOT EXISTS idx_behavior_incidents_incident_date ON behavior_incidents(incident_date);

-- Create triggers for updated_at
CREATE TRIGGER update_behavior_categories_updated_at
  BEFORE UPDATE ON behavior_categories
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_behavior_severity_levels_updated_at
  BEFORE UPDATE ON behavior_severity_levels
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_behavior_items_updated_at
  BEFORE UPDATE ON behavior_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_behavior_incidents_updated_at
  BEFORE UPDATE ON behavior_incidents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert default categories and severity levels for existing schools
DO $$
DECLARE
  school_record RECORD;
BEGIN
  FOR school_record IN SELECT id FROM schools LOOP
    -- Insert default categories
    INSERT INTO behavior_categories (school_id, name, description, color) VALUES
      (school_record.id, 'Gedrag in de klas', 'Gedragsproblemen tijdens lessen', '#EF4444'),
      (school_record.id, 'Sociale interactie', 'Problemen met andere leerlingen', '#F59E0B'),
      (school_record.id, 'Respect en beleefdheid', 'Onbeleefd gedrag naar leerkrachten of medeleerlingen', '#8B5CF6'),
      (school_record.id, 'Schoolregels', 'Overtreding van schoolregels', '#3B82F6'),
      (school_record.id, 'Positief gedrag', 'Voorbeeldgedrag en prestaties', '#10B981')
    ON CONFLICT (school_id, name) DO NOTHING;

    -- Insert default severity levels
    INSERT INTO behavior_severity_levels (school_id, name, level, description, color) VALUES
      (school_record.id, 'Zeer licht', 1, 'Kleine overtredingen die weinig impact hebben', '#10B981'),
      (school_record.id, 'Licht', 2, 'Overtredingen die aandacht vereisen', '#F59E0B'),
      (school_record.id, 'Gemiddeld', 3, 'Serieuze overtredingen die actie vereisen', '#EF4444'),
      (school_record.id, 'Ernstig', 4, 'Ernstige overtredingen met grote impact', '#DC2626'),
      (school_record.id, 'Zeer ernstig', 5, 'Zeer ernstige overtredingen die onmiddellijke actie vereisen', '#7F1D1D')
    ON CONFLICT (school_id, name) DO NOTHING;
  END LOOP;
END $$;