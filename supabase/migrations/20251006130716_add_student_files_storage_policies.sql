/*
  # Add Storage Policies for Student Files

  1. Storage Policies
    - Allow authenticated users to insert/upload student files
    - Allow public read access to student files (bucket is public)
    - Allow authenticated users to update student files
    - Allow authenticated users to delete student files
    
  2. Security
    - INSERT: Authenticated users can upload to student-files bucket
    - SELECT: Public can read files (for displaying images)
    - UPDATE: Authenticated users can update files in student-files bucket
    - DELETE: Authenticated users can delete files in student-files bucket
*/

-- Policy: Allow authenticated users to upload student files
CREATE POLICY "Authenticated users can upload student files"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'student-files'
);

-- Policy: Allow public read access to student files (since bucket is public)
CREATE POLICY "Public read access to student files"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'student-files');

-- Policy: Allow authenticated users to update student files
CREATE POLICY "Authenticated users can update student files"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'student-files')
WITH CHECK (bucket_id = 'student-files');

-- Policy: Allow authenticated users to delete student files
CREATE POLICY "Authenticated users can delete student files"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'student-files');