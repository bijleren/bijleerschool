/*
  # Fix function to reorder severity levels atomically
  
  Replaces the previous function with one that uses a single UPDATE
  with CASE statement to avoid unique constraint conflicts.
*/

CREATE OR REPLACE FUNCTION reorder_severity_levels(
  level_updates jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  update_sql text;
  case_stmt text := '';
  id_list text := '';
  item jsonb;
  first boolean := true;
BEGIN
  -- Build CASE statement and ID list
  FOR item IN SELECT * FROM jsonb_array_elements(level_updates)
  LOOP
    IF NOT first THEN
      id_list := id_list || ',';
    END IF;
    first := false;
    
    case_stmt := case_stmt || format(' WHEN id = %L THEN %s', 
                                      (item->>'id')::uuid, 
                                      item->>'level');
    id_list := id_list || format('%L', (item->>'id')::uuid);
  END LOOP;
  
  -- Execute single UPDATE with CASE
  update_sql := format('UPDATE behavior_severity_levels SET level = CASE %s END WHERE id IN (%s)',
                       case_stmt, id_list);
  
  EXECUTE update_sql;
END;
$$;