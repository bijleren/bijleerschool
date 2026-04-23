/*
  # Add Book Locations System

  ## Overview
  Adds a location system for the Boeker (library) module so books can be tagged
  with a physical shelf or room location within the school.

  ## New Tables
  - `book_locations`
    - `id` (uuid, primary key)
    - `school_id` (uuid, FK to schools, scopes locations per school)
    - `name` (text, the location label e.g. "Kast 3", "Klaslokaal 4B")
    - `created_at` (timestamptz)

  ## Modified Tables
  - `books`
    - Adds nullable `location_id` (uuid, FK to book_locations)

  ## Security
  - RLS enabled on `book_locations`
  - Authenticated school members can read, insert, update, delete their school's locations
*/

CREATE TABLE IF NOT EXISTS book_locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  name text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE book_locations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "School members can read book locations"
  ON book_locations FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_schools
      WHERE user_schools.school_id = book_locations.school_id
        AND user_schools.user_id = auth.uid()
        AND user_schools.status = 'active'
    )
  );

CREATE POLICY "School members can insert book locations"
  ON book_locations FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_schools
      WHERE user_schools.school_id = book_locations.school_id
        AND user_schools.user_id = auth.uid()
        AND user_schools.status = 'active'
    )
  );

CREATE POLICY "School members can update book locations"
  ON book_locations FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_schools
      WHERE user_schools.school_id = book_locations.school_id
        AND user_schools.user_id = auth.uid()
        AND user_schools.status = 'active'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_schools
      WHERE user_schools.school_id = book_locations.school_id
        AND user_schools.user_id = auth.uid()
        AND user_schools.status = 'active'
    )
  );

CREATE POLICY "School members can delete book locations"
  ON book_locations FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_schools
      WHERE user_schools.school_id = book_locations.school_id
        AND user_schools.user_id = auth.uid()
        AND user_schools.status = 'active'
    )
  );

-- Add location_id column to books table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'books' AND column_name = 'location_id'
  ) THEN
    ALTER TABLE books ADD COLUMN location_id uuid REFERENCES book_locations(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_book_locations_school_id ON book_locations(school_id);
CREATE INDEX IF NOT EXISTS idx_books_location_id ON books(location_id);
