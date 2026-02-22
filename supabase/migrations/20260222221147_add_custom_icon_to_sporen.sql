/*
  # Add Custom Icon Support to Sporen

  1. Changes
    - Add `custom_icon_url` column to `sporen` table to store uploaded icon images
    - Teachers can now upload custom icons in addition to using predefined Lucide icons

  2. Notes
    - The `icon` column will continue to store Lucide icon names
    - When `custom_icon_url` is set, it takes precedence over the `icon` field
*/

-- Add custom_icon_url column to sporen table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sporen' AND column_name = 'custom_icon_url'
  ) THEN
    ALTER TABLE sporen ADD COLUMN custom_icon_url text;
  END IF;
END $$;