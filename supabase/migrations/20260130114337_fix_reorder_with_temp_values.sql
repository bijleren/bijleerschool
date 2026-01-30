/*
  # Fix severity level reordering with temporary values

  Updates the reorder function to avoid unique constraint violations
  by using a two-step process:
  1. Move all items to negative temporary positions
  2. Update to final positive positions
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
  temp_offset integer := 1000;
BEGIN
  -- Step 1: Move all items to temporary negative positions
  FOR item IN SELECT * FROM jsonb_array_elements(level_updates)
  LOOP
    UPDATE behavior_severity_levels
    SET level = -temp_offset - (item->>'level')::integer
    WHERE id = (item->>'id')::uuid;
  END LOOP;

  -- Step 2: Move from negative to final positive positions
  FOR item IN SELECT * FROM jsonb_array_elements(level_updates)
  LOOP
    UPDATE behavior_severity_levels
    SET level = (item->>'level')::integer
    WHERE id = (item->>'id')::uuid;
  END LOOP;
END;
$$;
