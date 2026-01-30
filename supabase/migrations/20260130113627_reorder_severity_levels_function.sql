/*
  # Add function to reorder severity levels atomically
  
  Creates a stored procedure that can update severity levels in one atomic operation,
  avoiding unique constraint conflicts during reordering.
*/

CREATE OR REPLACE FUNCTION reorder_severity_levels(
  level_updates jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  item jsonb;
BEGIN
  -- Loop through each update and apply it
  FOR item IN SELECT * FROM jsonb_array_elements(level_updates)
  LOOP
    UPDATE behavior_severity_levels
    SET level = (item->>'level')::integer
    WHERE id = (item->>'id')::uuid;
  END LOOP;
END;
$$;