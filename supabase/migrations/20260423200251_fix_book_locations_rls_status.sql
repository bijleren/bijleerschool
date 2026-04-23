/*
  # Fix book_locations RLS policies

  The original policies checked for user_schools.status = 'active' but the
  actual status value used in this project is 'approved'. This migration
  drops and recreates all four policies with the correct status check.
*/

DROP POLICY IF EXISTS "School members can read book locations" ON book_locations;
DROP POLICY IF EXISTS "School members can insert book locations" ON book_locations;
DROP POLICY IF EXISTS "School members can update book locations" ON book_locations;
DROP POLICY IF EXISTS "School members can delete book locations" ON book_locations;

CREATE POLICY "School members can read book locations"
  ON book_locations FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_schools
      WHERE user_schools.school_id = book_locations.school_id
        AND user_schools.user_id = auth.uid()
        AND user_schools.status = 'approved'
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
        AND user_schools.status = 'approved'
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
        AND user_schools.status = 'approved'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_schools
      WHERE user_schools.school_id = book_locations.school_id
        AND user_schools.user_id = auth.uid()
        AND user_schools.status = 'approved'
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
        AND user_schools.status = 'approved'
    )
  );
