/*
  # Add follow-up actions and incident attachments

  1. New Tables
    - `followup_actions`
      - `id` (uuid, primary key)
      - `school_id` (uuid, foreign key to schools)
      - `name` (text, name of the follow-up action)
      - `description` (text, optional description)
      - `color` (text, color for UI display)
      - `is_active` (boolean, default true)
      - `sort_order` (integer, for ordering)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
    
    - `behavior_incident_attachments`
      - `id` (uuid, primary key)
      - `incident_id` (uuid, foreign key to behavior_incidents)
      - `file_name` (text, original file name)
      - `file_url` (text, URL to the stored file)
      - `file_type` (text, MIME type)
      - `file_size` (integer, file size in bytes)
      - `uploaded_by` (uuid, foreign key to profiles)
      - `created_at` (timestamp)

  2. Schema Changes
    - Add `followup_action_id` column to behavior_incidents table
    - Add `followup_action_other` column for custom follow-up text

  3. Security
    - Enable RLS on both new tables
    - Add policies for school members to manage follow-up actions
    - Add policies for school members to manage incident attachments
*/

-- Create followup_actions table
CREATE TABLE IF NOT EXISTS followup_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  color text DEFAULT '#6B7280',
  is_active boolean DEFAULT true,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(school_id, name)
);

-- Create behavior_incident_attachments table
CREATE TABLE IF NOT EXISTS behavior_incident_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id uuid NOT NULL REFERENCES behavior_incidents(id) ON DELETE CASCADE,
  file_name text NOT NULL,
  file_url text NOT NULL,
  file_type text NOT NULL,
  file_size integer DEFAULT 0,
  uploaded_by uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now()
);

-- Add followup action columns to behavior_incidents
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'behavior_incidents' AND column_name = 'followup_action_id'
  ) THEN
    ALTER TABLE behavior_incidents ADD COLUMN followup_action_id uuid REFERENCES followup_actions(id) ON DELETE SET NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'behavior_incidents' AND column_name = 'followup_action_other'
  ) THEN
    ALTER TABLE behavior_incidents ADD COLUMN followup_action_other text;
  END IF;
END $$;

-- Enable RLS
ALTER TABLE followup_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE behavior_incident_attachments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for followup_actions
CREATE POLICY "School members can manage followup actions"
  ON followup_actions
  FOR ALL
  TO authenticated
  USING (school_id IN (
    SELECT user_schools.school_id
    FROM user_schools
    WHERE user_schools.user_id = auth.uid()
      AND user_schools.status = 'approved'
      AND user_schools.is_active = true
  ))
  WITH CHECK (school_id IN (
    SELECT user_schools.school_id
    FROM user_schools
    WHERE user_schools.user_id = auth.uid()
      AND user_schools.status = 'approved'
      AND user_schools.is_active = true
  ));

-- RLS Policies for behavior_incident_attachments
CREATE POLICY "School members can manage incident attachments"
  ON behavior_incident_attachments
  FOR ALL
  TO authenticated
  USING (incident_id IN (
    SELECT behavior_incidents.id
    FROM behavior_incidents
    WHERE behavior_incidents.school_id IN (
      SELECT user_schools.school_id
      FROM user_schools
      WHERE user_schools.user_id = auth.uid()
        AND user_schools.status = 'approved'
        AND user_schools.is_active = true
    )
  ))
  WITH CHECK (incident_id IN (
    SELECT behavior_incidents.id
    FROM behavior_incidents
    WHERE behavior_incidents.school_id IN (
      SELECT user_schools.school_id
      FROM user_schools
      WHERE user_schools.user_id = auth.uid()
        AND user_schools.status = 'approved'
        AND user_schools.is_active = true
    )
  ));

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_followup_actions_school_id ON followup_actions(school_id);
CREATE INDEX IF NOT EXISTS idx_followup_actions_active ON followup_actions(school_id, is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_behavior_incident_attachments_incident_id ON behavior_incident_attachments(incident_id);
CREATE INDEX IF NOT EXISTS idx_behavior_incidents_followup_action_id ON behavior_incidents(followup_action_id);

-- Add triggers for updated_at
CREATE TRIGGER update_followup_actions_updated_at
  BEFORE UPDATE ON followup_actions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();