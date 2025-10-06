/*
  # Add Support for Multiple Consequences per Incident

  1. New Tables
    - `behavior_incident_eerste_acties` (formerly consequences)
      - `id` (uuid, primary key)
      - `incident_id` (uuid, foreign key to behavior_incidents)
      - `consequence_id` (uuid, foreign key to consequences)
      - `notes` (text, optional notes for this consequence)
      - `created_at` (timestamp)
    
    - `behavior_incident_followup_acties`
      - `id` (uuid, primary key)
      - `incident_id` (uuid, foreign key to behavior_incidents)
      - `consequence_id` (uuid, foreign key to consequences)
      - `notes` (text, optional notes for this follow-up action)
      - `action_date` (date, when the follow-up action was performed)
      - `created_at` (timestamp)

  2. Changes
    - Remove `action_taken` column from `behavior_incidents` (deprecated - replaced by eerste acties)
    - Remove `followup_action_id` and `followup_action_other` columns (replaced by followup_acties table)

  3. Security
    - Enable RLS on both new tables
    - Add policies for authenticated users to manage their school's incident consequences
*/

-- Create eerste acties table (initial consequences)
CREATE TABLE IF NOT EXISTS behavior_incident_eerste_acties (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id uuid NOT NULL REFERENCES behavior_incidents(id) ON DELETE CASCADE,
  consequence_id uuid NOT NULL REFERENCES consequences(id) ON DELETE CASCADE,
  notes text,
  created_at timestamptz DEFAULT now()
);

-- Create followup acties table (follow-up actions with dates)
CREATE TABLE IF NOT EXISTS behavior_incident_followup_acties (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id uuid NOT NULL REFERENCES behavior_incidents(id) ON DELETE CASCADE,
  consequence_id uuid NOT NULL REFERENCES consequences(id) ON DELETE CASCADE,
  notes text,
  action_date date NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS on nieuwe tables
ALTER TABLE behavior_incident_eerste_acties ENABLE ROW LEVEL SECURITY;
ALTER TABLE behavior_incident_followup_acties ENABLE ROW LEVEL SECURITY;

-- Policies for eerste acties
CREATE POLICY "Users can view eerste acties for their school incidents"
  ON behavior_incident_eerste_acties FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM behavior_incidents bi
      INNER JOIN user_schools us ON bi.school_id = us.school_id
      WHERE bi.id = behavior_incident_eerste_acties.incident_id
      AND us.user_id = auth.uid()
      AND us.status = 'approved'
      AND us.is_active = true
    )
  );

CREATE POLICY "Users can insert eerste acties for their school incidents"
  ON behavior_incident_eerste_acties FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM behavior_incidents bi
      INNER JOIN user_schools us ON bi.school_id = us.school_id
      WHERE bi.id = behavior_incident_eerste_acties.incident_id
      AND us.user_id = auth.uid()
      AND us.status = 'approved'
      AND us.is_active = true
    )
  );

CREATE POLICY "Users can update eerste acties for their school incidents"
  ON behavior_incident_eerste_acties FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM behavior_incidents bi
      INNER JOIN user_schools us ON bi.school_id = us.school_id
      WHERE bi.id = behavior_incident_eerste_acties.incident_id
      AND us.user_id = auth.uid()
      AND us.status = 'approved'
      AND us.is_active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM behavior_incidents bi
      INNER JOIN user_schools us ON bi.school_id = us.school_id
      WHERE bi.id = behavior_incident_eerste_acties.incident_id
      AND us.user_id = auth.uid()
      AND us.status = 'approved'
      AND us.is_active = true
    )
  );

CREATE POLICY "Users can delete eerste acties for their school incidents"
  ON behavior_incident_eerste_acties FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM behavior_incidents bi
      INNER JOIN user_schools us ON bi.school_id = us.school_id
      WHERE bi.id = behavior_incident_eerste_acties.incident_id
      AND us.user_id = auth.uid()
      AND us.status = 'approved'
      AND us.is_active = true
    )
  );

-- Policies for followup acties
CREATE POLICY "Users can view followup acties for their school incidents"
  ON behavior_incident_followup_acties FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM behavior_incidents bi
      INNER JOIN user_schools us ON bi.school_id = us.school_id
      WHERE bi.id = behavior_incident_followup_acties.incident_id
      AND us.user_id = auth.uid()
      AND us.status = 'approved'
      AND us.is_active = true
    )
  );

CREATE POLICY "Users can insert followup acties for their school incidents"
  ON behavior_incident_followup_acties FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM behavior_incidents bi
      INNER JOIN user_schools us ON bi.school_id = us.school_id
      WHERE bi.id = behavior_incident_followup_acties.incident_id
      AND us.user_id = auth.uid()
      AND us.status = 'approved'
      AND us.is_active = true
    )
  );

CREATE POLICY "Users can update followup acties for their school incidents"
  ON behavior_incident_followup_acties FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM behavior_incidents bi
      INNER JOIN user_schools us ON bi.school_id = us.school_id
      WHERE bi.id = behavior_incident_followup_acties.incident_id
      AND us.user_id = auth.uid()
      AND us.status = 'approved'
      AND us.is_active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM behavior_incidents bi
      INNER JOIN user_schools us ON bi.school_id = us.school_id
      WHERE bi.id = behavior_incident_followup_acties.incident_id
      AND us.user_id = auth.uid()
      AND us.status = 'approved'
      AND us.is_active = true
    )
  );

CREATE POLICY "Users can delete followup acties for their school incidents"
  ON behavior_incident_followup_acties FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM behavior_incidents bi
      INNER JOIN user_schools us ON bi.school_id = us.school_id
      WHERE bi.id = behavior_incident_followup_acties.incident_id
      AND us.user_id = auth.uid()
      AND us.status = 'approved'
      AND us.is_active = true
    )
  );

-- Note: We're keeping action_taken, followup_action_id, and followup_action_other columns
-- for backward compatibility and gradual migration. They can be removed in a future migration
-- once all data has been migrated to the new tables.
