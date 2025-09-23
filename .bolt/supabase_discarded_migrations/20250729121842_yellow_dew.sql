/*
  # Complete School Day System

  This migration creates the complete school day system with:
  1. Core Functions (uid, update_updated_at_column)
  2. Day Templates table
  3. Day Template Blocks table  
  4. School Day Templates (connections)
  5. Group Day Templates (connections)
  6. Day Block Activities (usage tracking)
  7. Sample data for existing schools
  8. Security policies (RLS)
  9. Indexes for performance
*/

-- =============================================
-- 1. CREATE CORE FUNCTIONS
-- =============================================

-- Create uid() function if it doesn't exist
CREATE OR REPLACE FUNCTION uid() 
RETURNS uuid 
LANGUAGE sql 
STABLE
AS $$
  SELECT auth.uid();
$$;

-- Create update_updated_at_column function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- 2. CREATE DAY_TEMPLATES TABLE
-- =============================================

CREATE TABLE IF NOT EXISTS day_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  school_id uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  is_active boolean DEFAULT true NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  created_by uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE
);

-- Enable RLS
ALTER TABLE day_templates ENABLE ROW LEVEL SECURITY;

-- RLS Policies for day_templates
CREATE POLICY "School members can read day templates"
  ON day_templates
  FOR SELECT
  TO authenticated
  USING (
    school_id IN (
      SELECT user_schools.school_id
      FROM user_schools
      WHERE user_schools.user_id = uid()
        AND user_schools.status = 'approved'
        AND user_schools.is_active = true
    )
  );

CREATE POLICY "School members can insert day templates"
  ON day_templates
  FOR INSERT
  TO authenticated
  WITH CHECK (
    school_id IN (
      SELECT user_schools.school_id
      FROM user_schools
      WHERE user_schools.user_id = uid()
        AND user_schools.status = 'approved'
        AND user_schools.is_active = true
    )
    AND created_by = uid()
  );

CREATE POLICY "School members can update day templates"
  ON day_templates
  FOR UPDATE
  TO authenticated
  USING (
    school_id IN (
      SELECT user_schools.school_id
      FROM user_schools
      WHERE user_schools.user_id = uid()
        AND user_schools.status = 'approved'
        AND user_schools.is_active = true
    )
  )
  WITH CHECK (
    school_id IN (
      SELECT user_schools.school_id
      FROM user_schools
      WHERE user_schools.user_id = uid()
        AND user_schools.status = 'approved'
        AND user_schools.is_active = true
    )
  );

CREATE POLICY "School members can delete day templates"
  ON day_templates
  FOR DELETE
  TO authenticated
  USING (
    school_id IN (
      SELECT user_schools.school_id
      FROM user_schools
      WHERE user_schools.user_id = uid()
        AND user_schools.status = 'approved'
        AND user_schools.is_active = true
    )
  );

-- Indexes for day_templates
CREATE INDEX IF NOT EXISTS idx_day_templates_school_id ON day_templates(school_id);
CREATE INDEX IF NOT EXISTS idx_day_templates_active ON day_templates(school_id, is_active) WHERE is_active = true;

-- =============================================
-- 3. CREATE DAY_TEMPLATE_BLOCKS TABLE
-- =============================================

CREATE TABLE IF NOT EXISTS day_template_blocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid NOT NULL REFERENCES day_templates(id) ON DELETE CASCADE,
  day_of_week integer NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
  start_time time NOT NULL,
  end_time time NOT NULL,
  block_type text NOT NULL CHECK (block_type IN ('lesson', 'break', 'lunch', 'other')),
  title text NOT NULL,
  subject text,
  location text,
  description text,
  sort_order integer DEFAULT 0,
  is_active boolean DEFAULT true NOT NULL,
  CONSTRAINT valid_time_range CHECK (start_time < end_time)
);

-- Enable RLS
ALTER TABLE day_template_blocks ENABLE ROW LEVEL SECURITY;

-- RLS Policies for day_template_blocks
CREATE POLICY "School members can manage template blocks"
  ON day_template_blocks
  FOR ALL
  TO authenticated
  USING (
    template_id IN (
      SELECT dt.id
      FROM day_templates dt
      WHERE dt.school_id IN (
        SELECT user_schools.school_id
        FROM user_schools
        WHERE user_schools.user_id = uid()
          AND user_schools.status = 'approved'
          AND user_schools.is_active = true
      )
    )
  )
  WITH CHECK (
    template_id IN (
      SELECT dt.id
      FROM day_templates dt
      WHERE dt.school_id IN (
        SELECT user_schools.school_id
        FROM user_schools
        WHERE user_schools.user_id = uid()
          AND user_schools.status = 'approved'
          AND user_schools.is_active = true
      )
    )
  );

-- Indexes for day_template_blocks
CREATE INDEX IF NOT EXISTS idx_day_template_blocks_template_id ON day_template_blocks(template_id);
CREATE INDEX IF NOT EXISTS idx_day_template_blocks_day_time ON day_template_blocks(template_id, day_of_week, start_time);

-- =============================================
-- 4. CREATE SCHOOL_DAY_TEMPLATES TABLE
-- =============================================

CREATE TABLE IF NOT EXISTS school_day_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  template_id uuid NOT NULL REFERENCES day_templates(id) ON DELETE CASCADE,
  is_default boolean DEFAULT false NOT NULL,
  effective_from date NOT NULL,
  effective_until date,
  UNIQUE(school_id, template_id),
  CONSTRAINT valid_date_range CHECK (effective_until IS NULL OR effective_from <= effective_until)
);

-- Enable RLS
ALTER TABLE school_day_templates ENABLE ROW LEVEL SECURITY;

-- RLS Policies for school_day_templates
CREATE POLICY "School members can manage school day templates"
  ON school_day_templates
  FOR ALL
  TO authenticated
  USING (
    school_id IN (
      SELECT user_schools.school_id
      FROM user_schools
      WHERE user_schools.user_id = uid()
        AND user_schools.status = 'approved'
        AND user_schools.is_active = true
    )
  )
  WITH CHECK (
    school_id IN (
      SELECT user_schools.school_id
      FROM user_schools
      WHERE user_schools.user_id = uid()
        AND user_schools.status = 'approved'
        AND user_schools.is_active = true
    )
  );

-- Indexes for school_day_templates
CREATE INDEX IF NOT EXISTS idx_school_day_templates_school_id ON school_day_templates(school_id);
CREATE INDEX IF NOT EXISTS idx_school_day_templates_effective ON school_day_templates(school_id, effective_from, effective_until);

-- =============================================
-- 5. CREATE GROUP_DAY_TEMPLATES TABLE
-- =============================================

CREATE TABLE IF NOT EXISTS group_day_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  template_id uuid NOT NULL REFERENCES day_templates(id) ON DELETE CASCADE,
  is_default boolean DEFAULT false NOT NULL,
  effective_from date NOT NULL,
  effective_until date,
  UNIQUE(group_id, template_id),
  CONSTRAINT valid_date_range CHECK (effective_until IS NULL OR effective_from <= effective_until)
);

-- Enable RLS
ALTER TABLE group_day_templates ENABLE ROW LEVEL SECURITY;

-- RLS Policies for group_day_templates
CREATE POLICY "School members can manage group day templates"
  ON group_day_templates
  FOR ALL
  TO authenticated
  USING (
    group_id IN (
      SELECT g.id
      FROM groups g
      WHERE g.school_id IN (
        SELECT user_schools.school_id
        FROM user_schools
        WHERE user_schools.user_id = uid()
          AND user_schools.status = 'approved'
          AND user_schools.is_active = true
      )
    )
  )
  WITH CHECK (
    group_id IN (
      SELECT g.id
      FROM groups g
      WHERE g.school_id IN (
        SELECT user_schools.school_id
        FROM user_schools
        WHERE user_schools.user_id = uid()
          AND user_schools.status = 'approved'
          AND user_schools.is_active = true
      )
    )
  );

-- Indexes for group_day_templates
CREATE INDEX IF NOT EXISTS idx_group_day_templates_group_id ON group_day_templates(group_id);
CREATE INDEX IF NOT EXISTS idx_group_day_templates_effective ON group_day_templates(group_id, effective_from, effective_until);

-- =============================================
-- 6. CREATE DAY_BLOCK_ACTIVITIES TABLE
-- =============================================

CREATE TABLE IF NOT EXISTS day_block_activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_block_id uuid NOT NULL REFERENCES day_template_blocks(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  activity_date date NOT NULL,
  activity_type text NOT NULL CHECK (activity_type IN ('technique_used', 'behavior_incident', 'note')),
  technique_id uuid REFERENCES teaching_techniques(id) ON DELETE SET NULL,
  behavior_incident_id uuid REFERENCES behavior_incidents(id) ON DELETE SET NULL,
  notes text,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Enable RLS
ALTER TABLE day_block_activities ENABLE ROW LEVEL SECURITY;

-- RLS Policies for day_block_activities
CREATE POLICY "Users can manage own block activities"
  ON day_block_activities
  FOR ALL
  TO authenticated
  USING (user_id = uid())
  WITH CHECK (user_id = uid());

CREATE POLICY "School members can read block activities"
  ON day_block_activities
  FOR SELECT
  TO authenticated
  USING (
    template_block_id IN (
      SELECT dtb.id
      FROM day_template_blocks dtb
      JOIN day_templates dt ON dt.id = dtb.template_id
      WHERE dt.school_id IN (
        SELECT user_schools.school_id
        FROM user_schools
        WHERE user_schools.user_id = uid()
          AND user_schools.status = 'approved'
          AND user_schools.is_active = true
      )
    )
  );

-- Indexes for day_block_activities
CREATE INDEX IF NOT EXISTS idx_day_block_activities_block_id ON day_block_activities(template_block_id);
CREATE INDEX IF NOT EXISTS idx_day_block_activities_user_date ON day_block_activities(user_id, activity_date);
CREATE INDEX IF NOT EXISTS idx_day_block_activities_technique ON day_block_activities(technique_id) WHERE technique_id IS NOT NULL;

-- =============================================
-- 7. POPULATE SAMPLE DATA
-- =============================================

-- Insert sample templates for existing schools
DO $$
DECLARE
  school_record RECORD;
  template_id_standard uuid;
  template_id_short uuid;
BEGIN
  -- Loop through all existing schools
  FOR school_record IN 
    SELECT id, created_by FROM schools WHERE created_by IS NOT NULL
  LOOP
    -- Create "Standaard Weekschema" template
    INSERT INTO day_templates (school_id, name, description, created_by)
    VALUES (
      school_record.id,
      'Standaard Weekschema',
      'Volledig weekschema voor reguliere schooldagen',
      school_record.created_by
    )
    ON CONFLICT DO NOTHING
    RETURNING id INTO template_id_standard;

    -- Get the template ID if it already existed
    IF template_id_standard IS NULL THEN
      SELECT id INTO template_id_standard 
      FROM day_templates 
      WHERE school_id = school_record.id AND name = 'Standaard Weekschema';
    END IF;

    -- Create "Verkort Schema" template
    INSERT INTO day_templates (school_id, name, description, created_by)
    VALUES (
      school_record.id,
      'Verkort Schema',
      'Verkort schema voor speciale dagen',
      school_record.created_by
    )
    ON CONFLICT DO NOTHING
    RETURNING id INTO template_id_short;

    -- Get the template ID if it already existed
    IF template_id_short IS NULL THEN
      SELECT id INTO template_id_short 
      FROM day_templates 
      WHERE school_id = school_record.id AND name = 'Verkort Schema';
    END IF;

    -- Add blocks for "Standaard Weekschema" (Monday = 1, Tuesday = 2, etc.)
    -- MONDAY
    INSERT INTO day_template_blocks (template_id, day_of_week, start_time, end_time, block_type, title, subject, location, sort_order)
    VALUES 
      (template_id_standard, 1, '08:30', '09:15', 'lesson', 'Nederlands', 'Nederlands', 'Lokaal 1A', 1),
      (template_id_standard, 1, '09:15', '09:30', 'break', 'Pauze', NULL, 'Speelplaats', 2),
      (template_id_standard, 1, '09:30', '10:15', 'lesson', 'Rekenen', 'Rekenen', 'Lokaal 1A', 3),
      (template_id_standard, 1, '10:15', '11:00', 'lesson', 'Wereldoriëntatie', 'Wereldoriëntatie', 'Lokaal 1A', 4),
      (template_id_standard, 1, '11:00', '11:15', 'break', 'Pauze', NULL, 'Speelplaats', 5),
      (template_id_standard, 1, '11:15', '12:00', 'lesson', 'Engels', 'Engels', 'Lokaal 1A', 6),
      (template_id_standard, 1, '12:00', '12:45', 'lunch', 'Lunch', NULL, 'Kantine', 7),
      (template_id_standard, 1, '12:45', '13:30', 'lesson', 'Gym', 'Lichamelijke Opvoeding', 'Gymzaal', 8),
      (template_id_standard, 1, '13:30', '14:15', 'lesson', 'Muziek', 'Muziek', 'Muziekzaal', 9),
      (template_id_standard, 1, '14:15', '15:00', 'lesson', 'Tekenen', 'Beeldende Vorming', 'Tekenaal', 10)
    ON CONFLICT DO NOTHING;

    -- TUESDAY
    INSERT INTO day_template_blocks (template_id, day_of_week, start_time, end_time, block_type, title, subject, location, sort_order)
    VALUES 
      (template_id_standard, 2, '08:30', '09:15', 'lesson', 'Rekenen', 'Rekenen', 'Lokaal 1A', 1),
      (template_id_standard, 2, '09:15', '09:30', 'break', 'Pauze', NULL, 'Speelplaats', 2),
      (template_id_standard, 2, '09:30', '10:15', 'lesson', 'Nederlands', 'Nederlands', 'Lokaal 1A', 3),
      (template_id_standard, 2, '10:15', '11:00', 'lesson', 'Geschiedenis', 'Geschiedenis', 'Lokaal 1A', 4),
      (template_id_standard, 2, '11:00', '11:15', 'break', 'Pauze', NULL, 'Speelplaats', 5),
      (template_id_standard, 2, '11:15', '12:00', 'lesson', 'Aardrijkskunde', 'Aardrijkskunde', 'Lokaal 1A', 6),
      (template_id_standard, 2, '12:00', '12:45', 'lunch', 'Lunch', NULL, 'Kantine', 7),
      (template_id_standard, 2, '12:45', '13:30', 'lesson', 'Engels', 'Engels', 'Lokaal 1A', 8),
      (template_id_standard, 2, '13:30', '14:15', 'lesson', 'Natuur & Techniek', 'Natuur & Techniek', 'Lokaal 1B', 9),
      (template_id_standard, 2, '14:15', '15:00', 'lesson', 'Rekenen', 'Rekenen', 'Lokaal 1A', 10)
    ON CONFLICT DO NOTHING;

    -- WEDNESDAY
    INSERT INTO day_template_blocks (template_id, day_of_week, start_time, end_time, block_type, title, subject, location, sort_order)
    VALUES 
      (template_id_standard, 3, '08:30', '09:15', 'lesson', 'Nederlands', 'Nederlands', 'Lokaal 1A', 1),
      (template_id_standard, 3, '09:15', '09:30', 'break', 'Pauze', NULL, 'Speelplaats', 2),
      (template_id_standard, 3, '09:30', '10:15', 'lesson', 'Rekenen', 'Rekenen', 'Lokaal 1A', 3),
      (template_id_standard, 3, '10:15', '11:00', 'lesson', 'Gym', 'Lichamelijke Opvoeding', 'Gymzaal', 4),
      (template_id_standard, 3, '11:00', '11:15', 'break', 'Pauze', NULL, 'Speelplaats', 5),
      (template_id_standard, 3, '11:15', '12:00', 'lesson', 'Wereldoriëntatie', 'Wereldoriëntatie', 'Lokaal 1A', 6),
      (template_id_standard, 3, '12:00', '12:30', 'other', 'Vrije tijd', NULL, 'Speelplaats', 7)
    ON CONFLICT DO NOTHING;

    -- THURSDAY
    INSERT INTO day_template_blocks (template_id, day_of_week, start_time, end_time, block_type, title, subject, location, sort_order)
    VALUES 
      (template_id_standard, 4, '08:30', '09:15', 'lesson', 'Rekenen', 'Rekenen', 'Lokaal 1A', 1),
      (template_id_standard, 4, '09:15', '09:30', 'break', 'Pauze', NULL, 'Speelplaats', 2),
      (template_id_standard, 4, '09:30', '10:15', 'lesson', 'Nederlands', 'Nederlands', 'Lokaal 1A', 3),
      (template_id_standard, 4, '10:15', '11:00', 'lesson', 'Engels', 'Engels', 'Lokaal 1A', 4),
      (template_id_standard, 4, '11:00', '11:15', 'break', 'Pauze', NULL, 'Speelplaats', 5),
      (template_id_standard, 4, '11:15', '12:00', 'lesson', 'Muziek', 'Muziek', 'Muziekzaal', 6),
      (template_id_standard, 4, '12:00', '12:45', 'lunch', 'Lunch', NULL, 'Kantine', 7),
      (template_id_standard, 4, '12:45', '13:30', 'lesson', 'Natuur & Techniek', 'Natuur & Techniek', 'Lokaal 1B', 8),
      (template_id_standard, 4, '13:30', '14:15', 'lesson', 'Tekenen', 'Beeldende Vorming', 'Tekenaal', 9),
      (template_id_standard, 4, '14:15', '15:00', 'lesson', 'Wereldoriëntatie', 'Wereldoriëntatie', 'Lokaal 1A', 10)
    ON CONFLICT DO NOTHING;

    -- FRIDAY
    INSERT INTO day_template_blocks (template_id, day_of_week, start_time, end_time, block_type, title, subject, location, sort_order)
    VALUES 
      (template_id_standard, 5, '08:30', '09:15', 'lesson', 'Nederlands', 'Nederlands', 'Lokaal 1A', 1),
      (template_id_standard, 5, '09:15', '09:30', 'break', 'Pauze', NULL, 'Speelplaats', 2),
      (template_id_standard, 5, '09:30', '10:15', 'lesson', 'Rekenen', 'Rekenen', 'Lokaal 1A', 3),
      (template_id_standard, 5, '10:15', '11:00', 'lesson', 'Gym', 'Lichamelijke Opvoeding', 'Gymzaal', 4),
      (template_id_standard, 5, '11:00', '11:15', 'break', 'Pauze', NULL, 'Speelplaats', 5),
      (template_id_standard, 5, '11:15', '12:00', 'lesson', 'Geschiedenis', 'Geschiedenis', 'Lokaal 1A', 6),
      (template_id_standard, 5, '12:00', '12:45', 'lunch', 'Lunch', NULL, 'Kantine', 7),
      (template_id_standard, 5, '12:45', '13:30', 'lesson', 'Aardrijkskunde', 'Aardrijkskunde', 'Lokaal 1A', 8),
      (template_id_standard, 5, '13:30', '14:15', 'lesson', 'Engels', 'Engels', 'Lokaal 1A', 9),
      (template_id_standard, 5, '14:15', '15:00', 'other', 'Evaluatie week', NULL, 'Lokaal 1A', 10)
    ON CONFLICT DO NOTHING;

    -- Add blocks for "Verkort Schema" (shorter day)
    INSERT INTO day_template_blocks (template_id, day_of_week, start_time, end_time, block_type, title, subject, location, sort_order)
    VALUES 
      -- Monday short
      (template_id_short, 1, '09:00', '09:45', 'lesson', 'Nederlands', 'Nederlands', 'Lokaal 1A', 1),
      (template_id_short, 1, '09:45', '10:00', 'break', 'Pauze', NULL, 'Speelplaats', 2),
      (template_id_short, 1, '10:00', '10:45', 'lesson', 'Rekenen', 'Rekenen', 'Lokaal 1A', 3),
      (template_id_short, 1, '10:45', '11:30', 'lesson', 'Wereldoriëntatie', 'Wereldoriëntatie', 'Lokaal 1A', 4),
      (template_id_short, 1, '11:30', '12:15', 'lesson', 'Engels', 'Engels', 'Lokaal 1A', 5),
      (template_id_short, 1, '12:15', '13:00', 'other', 'Afsluiting', NULL, 'Lokaal 1A', 6)
    ON CONFLICT DO NOTHING;

    -- Set "Standaard Weekschema" as default for the school
    INSERT INTO school_day_templates (school_id, template_id, is_default, effective_from)
    VALUES (
      school_record.id,
      template_id_standard,
      true,
      CURRENT_DATE
    )
    ON CONFLICT (school_id, template_id) DO NOTHING;

  END LOOP;
END $$;