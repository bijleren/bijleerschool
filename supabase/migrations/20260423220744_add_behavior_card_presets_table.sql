/*
  # Add behavior_card_presets table

  Creates a presets table for the Gedragskaart feature.
  Users can save named sets of card IDs as presets for quick re-use.

  1. New Tables
    - `behavior_card_presets`
      - `id` (uuid, pk)
      - `user_id` (uuid, FK auth.users)
      - `school_id` (uuid, FK schools, optional)
      - `name` (text)
      - `card_ids` (uuid[]) — array of behavior_card IDs
      - `created_at` (timestamptz)

  2. Security
    - RLS enabled
    - Users can only read/write their own presets
*/

CREATE TABLE IF NOT EXISTS behavior_card_presets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  school_id uuid REFERENCES schools(id) ON DELETE CASCADE,
  name text NOT NULL,
  card_ids uuid[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE behavior_card_presets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own behavior card presets"
  ON behavior_card_presets FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own behavior card presets"
  ON behavior_card_presets FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own behavior card presets"
  ON behavior_card_presets FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own behavior card presets"
  ON behavior_card_presets FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
