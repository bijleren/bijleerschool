/*
  # Create user favorites system

  1. New Tables
    - `user_favorites`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references profiles)
      - `favoritable_type` (text, either 'student' or 'group')
      - `favoritable_id` (uuid, references students or groups)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on `user_favorites` table
    - Add policies for users to manage their own favorites

  3. Indexes
    - Composite index on user_id and favoritable_type for fast queries
    - Unique constraint to prevent duplicate favorites
*/

-- Create user_favorites table
CREATE TABLE IF NOT EXISTS user_favorites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  favoritable_type text NOT NULL CHECK (favoritable_type IN ('student', 'group')),
  favoritable_id uuid NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, favoritable_type, favoritable_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_favorites_user_id ON user_favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_user_favorites_type_id ON user_favorites(favoritable_type, favoritable_id);
CREATE INDEX IF NOT EXISTS idx_user_favorites_user_type ON user_favorites(user_id, favoritable_type);

-- Enable RLS
ALTER TABLE user_favorites ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can read own favorites"
  ON user_favorites
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own favorites"
  ON user_favorites
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own favorites"
  ON user_favorites
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can update own favorites"
  ON user_favorites
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());