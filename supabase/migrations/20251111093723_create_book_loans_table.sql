/*
  # Create book loans tracking system

  1. New Tables
    - `book_loans`
      - `id` (uuid, primary key)
      - `book_id` (uuid, references books)
      - `student_id` (uuid, references students)
      - `school_id` (uuid, references schools)
      - `borrowed_at` (timestamptz) - when book was borrowed
      - `returned_at` (timestamptz, nullable) - when book was returned
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on `book_loans` table
    - Add policies for authenticated users to manage loans in their school

  3. Indexes
    - Index on book_id for quick loan lookups
    - Index on student_id for student loan history
    - Index on returned_at for active loan queries
*/

CREATE TABLE IF NOT EXISTS book_loans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  book_id uuid NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  school_id uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  borrowed_at timestamptz NOT NULL DEFAULT now(),
  returned_at timestamptz,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE book_loans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view loans in their school"
  ON book_loans FOR SELECT
  TO authenticated
  USING (
    school_id IN (
      SELECT school_id FROM user_schools
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create loans in their school"
  ON book_loans FOR INSERT
  TO authenticated
  WITH CHECK (
    school_id IN (
      SELECT school_id FROM user_schools
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update loans in their school"
  ON book_loans FOR UPDATE
  TO authenticated
  USING (
    school_id IN (
      SELECT school_id FROM user_schools
      WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    school_id IN (
      SELECT school_id FROM user_schools
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete loans in their school"
  ON book_loans FOR DELETE
  TO authenticated
  USING (
    school_id IN (
      SELECT school_id FROM user_schools
      WHERE user_id = auth.uid()
    )
  );

CREATE INDEX IF NOT EXISTS idx_book_loans_book_id ON book_loans(book_id);
CREATE INDEX IF NOT EXISTS idx_book_loans_student_id ON book_loans(student_id);
CREATE INDEX IF NOT EXISTS idx_book_loans_returned_at ON book_loans(returned_at);
CREATE INDEX IF NOT EXISTS idx_book_loans_school_id ON book_loans(school_id);
