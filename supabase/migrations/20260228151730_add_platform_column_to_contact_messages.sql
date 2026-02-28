/*
  # Add platform column to contact_messages

  Adds a 'platform' column to track which site the message came from.
  Defaults to 'bijleer.school'.
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'contact_messages' AND column_name = 'platform'
  ) THEN
    ALTER TABLE public.contact_messages ADD COLUMN platform text NOT NULL DEFAULT 'bijleer.school';
  END IF;
END $$;
