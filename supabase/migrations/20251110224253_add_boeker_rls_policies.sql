/*
  # Boeker Library System - RLS Policies

  ## Security Rules
  - Teachers can manage all books in their school
  - Teachers can view and manage student borrowing data
  - Students can view books and manage their own data
  - Reviews are tied to student accounts
*/

-- RLS Policies for books table
CREATE POLICY "School users can view books"
  ON books FOR SELECT
  TO authenticated
  USING (
    school_id IN (
      SELECT school_id FROM user_schools 
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

CREATE POLICY "School users can create books"
  ON books FOR INSERT
  TO authenticated
  WITH CHECK (
    school_id IN (
      SELECT school_id FROM user_schools 
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

CREATE POLICY "School users can update books"
  ON books FOR UPDATE
  TO authenticated
  USING (
    school_id IN (
      SELECT school_id FROM user_schools 
      WHERE user_id = auth.uid() AND is_active = true
    )
  )
  WITH CHECK (
    school_id IN (
      SELECT school_id FROM user_schools 
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

CREATE POLICY "School users can delete books"
  ON books FOR DELETE
  TO authenticated
  USING (
    school_id IN (
      SELECT school_id FROM user_schools 
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

-- RLS Policies for student_books table
CREATE POLICY "School users can view student books"
  ON student_books FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM students s
      JOIN user_schools us ON us.school_id = s.school_id
      WHERE s.id = student_books.student_id 
        AND us.user_id = auth.uid() 
        AND us.is_active = true
    )
  );

CREATE POLICY "School users can create student book records"
  ON student_books FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM students s
      JOIN user_schools us ON us.school_id = s.school_id
      WHERE s.id = student_books.student_id 
        AND us.user_id = auth.uid() 
        AND us.is_active = true
    )
  );

CREATE POLICY "School users can update student book records"
  ON student_books FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM students s
      JOIN user_schools us ON us.school_id = s.school_id
      WHERE s.id = student_books.student_id 
        AND us.user_id = auth.uid() 
        AND us.is_active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM students s
      JOIN user_schools us ON us.school_id = s.school_id
      WHERE s.id = student_books.student_id 
        AND us.user_id = auth.uid() 
        AND us.is_active = true
    )
  );

-- RLS Policies for reading_sessions table
CREATE POLICY "School users can view reading sessions"
  ON reading_sessions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM students s
      JOIN user_schools us ON us.school_id = s.school_id
      WHERE s.id = reading_sessions.student_id 
        AND us.user_id = auth.uid() 
        AND us.is_active = true
    )
  );

CREATE POLICY "School users can create reading sessions"
  ON reading_sessions FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM students s
      JOIN user_schools us ON us.school_id = s.school_id
      WHERE s.id = reading_sessions.student_id 
        AND us.user_id = auth.uid() 
        AND us.is_active = true
    )
  );

CREATE POLICY "School users can update reading sessions"
  ON reading_sessions FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM students s
      JOIN user_schools us ON us.school_id = s.school_id
      WHERE s.id = reading_sessions.student_id 
        AND us.user_id = auth.uid() 
        AND us.is_active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM students s
      JOIN user_schools us ON us.school_id = s.school_id
      WHERE s.id = reading_sessions.student_id 
        AND us.user_id = auth.uid() 
        AND us.is_active = true
    )
  );

-- RLS Policies for book_reviews table
CREATE POLICY "School users can view book reviews"
  ON book_reviews FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM students s
      JOIN user_schools us ON us.school_id = s.school_id
      WHERE s.id = book_reviews.student_id 
        AND us.user_id = auth.uid() 
        AND us.is_active = true
    )
  );

CREATE POLICY "School users can create book reviews"
  ON book_reviews FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM students s
      JOIN user_schools us ON us.school_id = s.school_id
      WHERE s.id = book_reviews.student_id 
        AND us.user_id = auth.uid() 
        AND us.is_active = true
    )
  );

CREATE POLICY "School users can update book reviews"
  ON book_reviews FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM students s
      JOIN user_schools us ON us.school_id = s.school_id
      WHERE s.id = book_reviews.student_id 
        AND us.user_id = auth.uid() 
        AND us.is_active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM students s
      JOIN user_schools us ON us.school_id = s.school_id
      WHERE s.id = book_reviews.student_id 
        AND us.user_id = auth.uid() 
        AND us.is_active = true
    )
  );

CREATE POLICY "School users can delete book reviews"
  ON book_reviews FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM students s
      JOIN user_schools us ON us.school_id = s.school_id
      WHERE s.id = book_reviews.student_id 
        AND us.user_id = auth.uid() 
        AND us.is_active = true
    )
  );
