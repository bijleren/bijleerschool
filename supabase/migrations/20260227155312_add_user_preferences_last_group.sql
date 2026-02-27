/*
  # Add user_preferences table for persisting last selected group

  ## Summary
  Adds a user_preferences table so each user can store their last selected group per school.
  This enables the reading coach (and future features) to auto-restore the last class selection
  when opening the create session form.

  ## New Tables
  - `user_preferences`
    - `id` (uuid, primary key)
    - `user_id` (uuid, references auth.users) - the authenticated user
    - `school_id` (uuid, references schools) - which school this preference is for
    - `last_group_id` (uuid, nullable, references groups) - last selected group/class
    - `updated_at` (timestamptz) - when this was last saved

  ## Security
  - RLS enabled
  - Users can only read and write their own preferences
*/

CREATE TABLE IF NOT EXISTS user_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  school_id uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  last_group_id uuid REFERENCES groups(id) ON DELETE SET NULL,
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, school_id)
);

ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own preferences"
  ON user_preferences FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own preferences"
  ON user_preferences FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own preferences"
  ON user_preferences FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
