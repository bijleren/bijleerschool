/*
  # Make behavior_item_id nullable in behavior_incidents

  ## Changes
  - `behavior_incidents.behavior_item_id`: Changed from NOT NULL to nullable

  ## Reason
  The incident form supports an "other" option where no specific behavior item
  is selected. The column must allow NULL to support this use case.
*/

ALTER TABLE behavior_incidents ALTER COLUMN behavior_item_id DROP NOT NULL;
