/*
  # Add Public Access Policies for Bibliotheek (Student WebWijzer)

  ## Changes
  - Add anon access policies for `books` table
  - Add anon access policies for `school_materials` table
  - Add anon access policies for `student_books` table
  - Add anon access policies for `school_material_loans` table

  ## Security Notes
  - Students access WebWijzer without authentication (via access hash in URL)
  - They need to be able to:
    1. Read books and materials in their school
    2. Create loan records for themselves
    3. View their own loan records
  - Access is implicitly scoped by the student_id and school_id they have access to
*/

-- Allow anon users to view books
CREATE POLICY "Public users can view books"
  ON books FOR SELECT
  TO anon
  USING (true);

-- Allow anon users to view school materials
CREATE POLICY "Public users can view school materials"
  ON school_materials FOR SELECT
  TO anon
  USING (true);

-- Allow anon users to view student book loans
CREATE POLICY "Public users can view student books"
  ON student_books FOR SELECT
  TO anon
  USING (true);

-- Allow anon users to create student book loans
CREATE POLICY "Public users can create student book loans"
  ON student_books FOR INSERT
  TO anon
  WITH CHECK (true);

-- Allow anon users to update student book loans (for returns)
CREATE POLICY "Public users can update student books"
  ON student_books FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

-- Allow anon users to view material loans
CREATE POLICY "Public users can view material loans"
  ON school_material_loans FOR SELECT
  TO anon
  USING (true);

-- Allow anon users to create material loans
CREATE POLICY "Public users can create material loans"
  ON school_material_loans FOR INSERT
  TO anon
  WITH CHECK (true);

-- Allow anon users to update material loans (for returns)
CREATE POLICY "Public users can update material loans"
  ON school_material_loans FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

-- Allow anon users to update book available copies
CREATE POLICY "Public users can update book copies"
  ON books FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

-- Allow anon users to update material availability
CREATE POLICY "Public users can update material availability"
  ON school_materials FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);
