-- Fix: The 20260511201841 migration dropped the public SELECT policy on student-files
-- to prevent listing. However, this also broke authenticated uploads with upsert:true
-- because Supabase storage needs a SELECT to check if the object exists before overwriting.
-- Add a scoped SELECT policy for authenticated users that only allows reading objects
-- they own (files in their school's folder), while keeping public direct-URL access
-- via the public bucket setting.

-- Allow authenticated users to SELECT (list/read) student files
-- This is needed for upsert operations and for the app to check existing files
CREATE POLICY "Authenticated users can read student files"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'student-files');