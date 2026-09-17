-- Increase file size limit from 5MB to 10MB for student-files bucket
-- Phone photos can easily exceed 5MB even after cropping
UPDATE storage.buckets
SET file_size_limit = 10485760
WHERE id = 'student-files';
