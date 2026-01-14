/*
  # Add Missing Foreign Key Indexes

  ## Performance Improvements
  - Add indexes for foreign keys that lack covering indexes
  - Improves query performance for JOIN operations
  - Prevents performance degradation at scale

  ## Changes
  1. Add index for material_feedback(material_loan_id)
  2. Add index for storage_usage_log(uploaded_by)
  3. Add index for zoeker_notifications(request_id)
  4. Add index for zoeker_search_requests(reviewed_by)
*/

-- Add index for material_feedback foreign key
CREATE INDEX IF NOT EXISTS idx_material_feedback_material_loan_id 
ON material_feedback(material_loan_id);

-- Add index for storage_usage_log foreign key
CREATE INDEX IF NOT EXISTS idx_storage_usage_log_uploaded_by 
ON storage_usage_log(uploaded_by);

-- Add index for zoeker_notifications foreign key
CREATE INDEX IF NOT EXISTS idx_zoeker_notifications_request_id 
ON zoeker_notifications(request_id);

-- Add index for zoeker_search_requests foreign key
CREATE INDEX IF NOT EXISTS idx_zoeker_search_requests_reviewed_by 
ON zoeker_search_requests(reviewed_by);
