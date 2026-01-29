/*
  # Create Storage Bucket for Activity Board Icons

  1. Storage Bucket
    - `activity-board-icons` - For storing custom board icons/images
  
  2. Security
    - Enable RLS on storage bucket
    - Allow authenticated users to upload files
    - Public read access for displaying icons
    - File size limit: 2MB
    - Allowed types: PNG, JPG, JPEG, SVG, WebP
  
  3. Policies
    - INSERT: Authenticated school members can upload
    - SELECT: Public read access
    - UPDATE: Owner can update their files
    - DELETE: Owner can delete their files
*/

-- Create activity-board-icons bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'activity-board-icons',
  'activity-board-icons',
  true,
  2097152, -- 2MB limit
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/svg+xml']
)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload board icons
CREATE POLICY "Authenticated users can upload board icons"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'activity-board-icons'
);

-- Allow everyone to view board icons (public bucket)
CREATE POLICY "Anyone can view board icons"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'activity-board-icons');

-- Allow authenticated users to update their uploaded files
CREATE POLICY "Users can update board icons"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'activity-board-icons' AND auth.uid() = owner)
WITH CHECK (bucket_id = 'activity-board-icons');

-- Allow authenticated users to delete their uploaded files
CREATE POLICY "Users can delete board icons"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'activity-board-icons' AND auth.uid() = owner);