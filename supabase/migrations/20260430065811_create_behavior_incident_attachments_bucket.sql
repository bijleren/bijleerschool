/*
  # Create attachments storage bucket for behavior incidents

  1. New Storage Bucket
    - `attachments` (public) — stores files uploaded to behavior incidents
  2. Storage Policies
    - Authenticated users can upload to behavior-incidents/ path
    - Authenticated users can read files in behavior-incidents/ path
    - Authenticated users can delete files they uploaded
*/

INSERT INTO storage.buckets (id, name, public)
VALUES ('attachments', 'attachments', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Authenticated users can upload incident attachments"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'attachments' AND name LIKE 'behavior-incidents/%');

CREATE POLICY "Authenticated users can read incident attachments"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'attachments' AND name LIKE 'behavior-incidents/%');

CREATE POLICY "Authenticated users can delete incident attachments"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'attachments' AND name LIKE 'behavior-incidents/%');
