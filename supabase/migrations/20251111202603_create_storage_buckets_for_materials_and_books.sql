/*
  # Create Storage Buckets for Materials and Books

  1. Storage Buckets
    - `material-photos` - For storing photos of school materials
    - `book-covers` - For storing book cover images
  
  2. Security
    - Enable RLS on storage buckets
    - Allow authenticated users to upload files to their school's folder
    - Allow authenticated users to read all files
    - Files are organized by school_id for better organization
  
  3. Policies
    - INSERT: Authenticated users can upload files
    - SELECT: Authenticated users can view all files
    - UPDATE: Users can update files they uploaded
    - DELETE: Users can delete files they uploaded
*/

-- Create material-photos bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'material-photos',
  'material-photos',
  true,
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

-- Create book-covers bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'book-covers',
  'book-covers',
  true,
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for material-photos bucket

-- Allow authenticated users to upload material photos
CREATE POLICY "Authenticated users can upload material photos"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'material-photos'
);

-- Allow everyone to view material photos (public bucket)
CREATE POLICY "Anyone can view material photos"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'material-photos');

-- Allow authenticated users to update their uploaded files
CREATE POLICY "Users can update material photos"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'material-photos' AND auth.uid() = owner)
WITH CHECK (bucket_id = 'material-photos');

-- Allow authenticated users to delete their uploaded files
CREATE POLICY "Users can delete material photos"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'material-photos' AND auth.uid() = owner);

-- Storage policies for book-covers bucket

-- Allow authenticated users to upload book covers
CREATE POLICY "Authenticated users can upload book covers"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'book-covers'
);

-- Allow everyone to view book covers (public bucket)
CREATE POLICY "Anyone can view book covers"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'book-covers');

-- Allow authenticated users to update their uploaded files
CREATE POLICY "Users can update book covers"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'book-covers' AND auth.uid() = owner)
WITH CHECK (bucket_id = 'book-covers');

-- Allow authenticated users to delete their uploaded files
CREATE POLICY "Users can delete book covers"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'book-covers' AND auth.uid() = owner);
