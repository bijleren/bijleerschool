-- Add user_id to contact_messages to link authenticated submissions to user accounts
ALTER TABLE contact_messages ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_contact_messages_user_id ON contact_messages(user_id);

-- Allow authenticated users to read their own messages
CREATE POLICY "Users can read own contact_messages"
  ON contact_messages FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());
