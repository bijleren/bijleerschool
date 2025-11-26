/*
  # Add description column to newsletters table

  1. Changes
    - Add `description` column to `newsletters` table (text, optional)
    - Allows newsletters to have a short description shown in the card view
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'newsletters' AND column_name = 'description'
  ) THEN
    ALTER TABLE newsletters ADD COLUMN description text;
  END IF;
END $$;