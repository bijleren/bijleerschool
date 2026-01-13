/*
  # Add Storage Tracking to Schools

  1. Schema Changes
    - Add `storage_used_bytes` (bigint) to schools table - tracks total storage used in bytes
    - Add `storage_limit_bytes` (bigint) to schools table - tracks storage limit in bytes (default 5GB for free, higher for premium)
    - Add index on storage fields for efficient queries

  2. New Tables
    - `storage_usage_log` - tracks individual file uploads and their sizes
      - `id` (uuid, primary key)
      - `school_id` (uuid, foreign key to schools)
      - `file_type` (text) - e.g., 'student_photo', 'book_cover', 'material', etc.
      - `file_path` (text) - storage path
      - `file_size_bytes` (bigint) - size of the file
      - `uploaded_by` (uuid, foreign key to users)
      - `uploaded_at` (timestamptz)
      - `deleted_at` (timestamptz) - for soft deletes

  3. Security
    - Enable RLS on storage_usage_log
    - Add policies for school admins to view their storage logs
    - Add policies for authenticated users to insert storage logs

  4. Helper Function
    - Create function to update school storage usage
    - Create function to calculate storage by file type
*/

-- Add storage tracking columns to schools table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'schools' AND column_name = 'storage_used_bytes'
  ) THEN
    ALTER TABLE schools ADD COLUMN storage_used_bytes BIGINT DEFAULT 0 NOT NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'schools' AND column_name = 'storage_limit_bytes'
  ) THEN
    ALTER TABLE schools ADD COLUMN storage_limit_bytes BIGINT DEFAULT 5368709120 NOT NULL;
  END IF;
END $$;

-- Create index for storage queries
CREATE INDEX IF NOT EXISTS idx_schools_storage ON schools(storage_used_bytes, storage_limit_bytes);

-- Create storage usage log table
CREATE TABLE IF NOT EXISTS storage_usage_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  file_type TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size_bytes BIGINT NOT NULL,
  uploaded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  uploaded_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_storage_log_school ON storage_usage_log(school_id, deleted_at);
CREATE INDEX IF NOT EXISTS idx_storage_log_type ON storage_usage_log(file_type);
CREATE INDEX IF NOT EXISTS idx_storage_log_uploaded_at ON storage_usage_log(uploaded_at);

-- Enable RLS
ALTER TABLE storage_usage_log ENABLE ROW LEVEL SECURITY;

-- Policy: School admins can view their storage logs
CREATE POLICY "School admins can view their storage logs"
  ON storage_usage_log FOR SELECT
  TO authenticated
  USING (
    school_id IN (
      SELECT us.school_id
      FROM user_schools us
      WHERE us.user_id = auth.uid()
      AND us.role = 'admin'
    )
  );

-- Policy: Authenticated users can insert storage logs for their schools
CREATE POLICY "Users can insert storage logs for their schools"
  ON storage_usage_log FOR INSERT
  TO authenticated
  WITH CHECK (
    school_id IN (
      SELECT us.school_id
      FROM user_schools us
      WHERE us.user_id = auth.uid()
    )
  );

-- Policy: School admins can update storage logs (for soft delete)
CREATE POLICY "School admins can update their storage logs"
  ON storage_usage_log FOR UPDATE
  TO authenticated
  USING (
    school_id IN (
      SELECT us.school_id
      FROM user_schools us
      WHERE us.user_id = auth.uid()
      AND us.role = 'admin'
    )
  );

-- Function to update school storage usage
CREATE OR REPLACE FUNCTION update_school_storage_usage(p_school_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE schools
  SET storage_used_bytes = (
    SELECT COALESCE(SUM(file_size_bytes), 0)
    FROM storage_usage_log
    WHERE school_id = p_school_id
    AND deleted_at IS NULL
  )
  WHERE id = p_school_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get storage breakdown by file type
CREATE OR REPLACE FUNCTION get_storage_breakdown(p_school_id UUID)
RETURNS TABLE(
  file_type TEXT,
  total_size_bytes BIGINT,
  file_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    sul.file_type,
    SUM(sul.file_size_bytes)::BIGINT as total_size_bytes,
    COUNT(*)::BIGINT as file_count
  FROM storage_usage_log sul
  WHERE sul.school_id = p_school_id
  AND sul.deleted_at IS NULL
  GROUP BY sul.file_type
  ORDER BY total_size_bytes DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;