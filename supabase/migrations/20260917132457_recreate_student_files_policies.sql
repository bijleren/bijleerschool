-- Drop and recreate all student-files storage policies
-- The previous policies may have been in a broken state after multiple migrations

-- Drop all existing student-files policies
DROP POLICY IF EXISTS "Authenticated users can read student files" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload student files" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update student files" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete student files" ON storage.objects;

-- Recreate with clean, simple policies
CREATE POLICY "Authenticated users can read student files"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'student-files');

CREATE POLICY "Authenticated users can upload student files"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'student-files');

CREATE POLICY "Authenticated users can update student files"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'student-files')
WITH CHECK (bucket_id = 'student-files');

CREATE POLICY "Authenticated users can delete student files"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'student-files');
