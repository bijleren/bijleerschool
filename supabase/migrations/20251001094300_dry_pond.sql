/*
  # Create behavior incident notifications table

  1. New Tables
    - `behavior_incident_notifications`
      - `id` (uuid, primary key)
      - `incident_id` (uuid, foreign key to behavior_incidents)
      - `teacher_id` (uuid, foreign key to profiles, nullable)
      - `group_id` (uuid, foreign key to groups, nullable)
      - `notification_type` (text, either 'teacher' or 'group')
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on `behavior_incident_notifications` table
    - Add policy for school members to manage notifications
    - Add constraint to ensure either teacher_id or group_id is set

  3. Indexes
    - Add indexes for efficient querying by incident_id, teacher_id, and group_id
*/

CREATE TABLE IF NOT EXISTS behavior_incident_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id uuid NOT NULL,
  teacher_id uuid,
  group_id uuid,
  notification_type text NOT NULL CHECK (notification_type IN ('teacher', 'group')),
  created_at timestamptz DEFAULT now(),
  CONSTRAINT check_notification_target CHECK (
    (notification_type = 'teacher' AND teacher_id IS NOT NULL AND group_id IS NULL) OR
    (notification_type = 'group' AND group_id IS NOT NULL AND teacher_id IS NULL)
  )
);

-- Add foreign key constraints
ALTER TABLE behavior_incident_notifications 
ADD CONSTRAINT behavior_incident_notifications_incident_id_fkey 
FOREIGN KEY (incident_id) REFERENCES behavior_incidents(id) ON DELETE CASCADE;

ALTER TABLE behavior_incident_notifications 
ADD CONSTRAINT behavior_incident_notifications_teacher_id_fkey 
FOREIGN KEY (teacher_id) REFERENCES profiles(id) ON DELETE CASCADE;

ALTER TABLE behavior_incident_notifications 
ADD CONSTRAINT behavior_incident_notifications_group_id_fkey 
FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_behavior_incident_notifications_incident_id 
ON behavior_incident_notifications(incident_id);

CREATE INDEX IF NOT EXISTS idx_behavior_incident_notifications_teacher_id 
ON behavior_incident_notifications(teacher_id) WHERE teacher_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_behavior_incident_notifications_group_id 
ON behavior_incident_notifications(group_id) WHERE group_id IS NOT NULL;

-- Enable RLS
ALTER TABLE behavior_incident_notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "School members can manage incident notifications"
  ON behavior_incident_notifications
  FOR ALL
  TO authenticated
  USING (
    incident_id IN (
      SELECT id FROM behavior_incidents 
      WHERE school_id IN (
        SELECT school_id FROM user_schools 
        WHERE user_id = auth.uid() 
        AND status = 'approved' 
        AND is_active = true
      )
    )
  )
  WITH CHECK (
    incident_id IN (
      SELECT id FROM behavior_incidents 
      WHERE school_id IN (
        SELECT school_id FROM user_schools 
        WHERE user_id = auth.uid() 
        AND status = 'approved' 
        AND is_active = true
      )
    )
  );