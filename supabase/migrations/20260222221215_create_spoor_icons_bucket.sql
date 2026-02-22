/*
  # Create Storage Bucket for Spoor Icons

  1. New Storage Bucket
    - Creates `spoor-icons` bucket for custom spoor icon uploads
    - Public access for reading icons
    - Restricted upload access to authenticated users

  2. Security
    - Authenticated users can upload icons for their schools
    - Anyone can view the icons (public read access)
    - File size limits and image type restrictions
*/

-- Create spoor-icons storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'spoor-icons',
  'spoor-icons',
  true,
  2097152, -- 2MB limit
  ARRAY['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp', 'image/svg+xml']
)
ON CONFLICT (id) DO NOTHING;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Authenticated users can upload spoor icons" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update spoor icons" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete spoor icons" ON storage.objects;
DROP POLICY IF EXISTS "Public can view spoor icons" ON storage.objects;

-- Allow authenticated users to upload spoor icons
CREATE POLICY "Authenticated users can upload spoor icons"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'spoor-icons');

-- Allow authenticated users to update their spoor icons
CREATE POLICY "Authenticated users can update spoor icons"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'spoor-icons')
  WITH CHECK (bucket_id = 'spoor-icons');

-- Allow authenticated users to delete their spoor icons
CREATE POLICY "Authenticated users can delete spoor icons"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'spoor-icons');

-- Allow public read access to spoor icons
CREATE POLICY "Public can view spoor icons"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'spoor-icons');