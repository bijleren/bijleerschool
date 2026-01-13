/*
  # Create WebWijzer Files Storage Bucket

  1. Storage Bucket
    - Creates `webwijzer-files` bucket for storing uploaded files
    - Public access enabled for viewing files
    
  2. Security
    - Authenticated users can upload files
    - Public read access for all files
    - Delete access for authenticated users
*/

INSERT INTO storage.buckets (id, name, public)
VALUES ('webwijzer-files', 'webwijzer-files', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Authenticated users can upload webwijzer files"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'webwijzer-files');

CREATE POLICY "Public can view webwijzer files"
  ON storage.objects
  FOR SELECT
  TO public
  USING (bucket_id = 'webwijzer-files');

CREATE POLICY "Authenticated users can delete their webwijzer files"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (bucket_id = 'webwijzer-files');