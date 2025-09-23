/*
  # Add Consequences Feature

  1. New Tables
    - `consequences`
      - `id` (uuid, primary key)
      - `school_id` (uuid, foreign key to schools)
      - `name` (text, not null)
      - `description` (text, nullable)
      - `severity_level` (integer, 1-5, nullable)
      - `is_active` (boolean, default true)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
    
    - `behavior_item_consequences`
      - `id` (uuid, primary key)
      - `behavior_item_id` (uuid, foreign key to behavior_items)
      - `consequence_id` (uuid, foreign key to consequences)
      - `is_default` (boolean, default false)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on both tables
    - Add policies for school members to manage consequences
    - Add policies for school members to manage behavior item consequences

  3. Indexes
    - Add indexes for performance on foreign keys and common queries
*/

-- Create consequences table
CREATE TABLE IF NOT EXISTS consequences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  severity_level integer CHECK (severity_level >= 1 AND severity_level <= 5),
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create behavior_item_consequences junction table
CREATE TABLE IF NOT EXISTS behavior_item_consequences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  behavior_item_id uuid NOT NULL REFERENCES behavior_items(id) ON DELETE CASCADE,
  consequence_id uuid NOT NULL REFERENCES consequences(id) ON DELETE CASCADE,
  is_default boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  UNIQUE(behavior_item_id, consequence_id)
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_consequences_school_id ON consequences(school_id);
CREATE INDEX IF NOT EXISTS idx_consequences_active ON consequences(school_id, is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_behavior_item_consequences_behavior_item ON behavior_item_consequences(behavior_item_id);
CREATE INDEX IF NOT EXISTS idx_behavior_item_consequences_consequence ON behavior_item_consequences(consequence_id);

-- Enable RLS
ALTER TABLE consequences ENABLE ROW LEVEL SECURITY;
ALTER TABLE behavior_item_consequences ENABLE ROW LEVEL SECURITY;

-- Add RLS policies for consequences
CREATE POLICY "School members can manage consequences"
  ON consequences
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

-- Add RLS policies for behavior_item_consequences
CREATE POLICY "School members can manage behavior item consequences"
  ON behavior_item_consequences
  FOR ALL
  TO authenticated
  USING (behavior_item_id IN (
    SELECT behavior_items.id
    FROM behavior_items
    WHERE behavior_items.school_id IN (
      SELECT user_schools.school_id
      FROM user_schools
      WHERE user_schools.user_id = auth.uid()
        AND user_schools.status = 'approved'
        AND user_schools.is_active = true
    )
  ))
  WITH CHECK (behavior_item_id IN (
    SELECT behavior_items.id
    FROM behavior_items
    WHERE behavior_items.school_id IN (
      SELECT user_schools.school_id
      FROM user_schools
      WHERE user_schools.user_id = auth.uid()
        AND user_schools.status = 'approved'
        AND user_schools.is_active = true
    )
  ));

-- Add updated_at trigger for consequences
CREATE TRIGGER update_consequences_updated_at
  BEFORE UPDATE ON consequences
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();