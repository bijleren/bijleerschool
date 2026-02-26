/*
  # Seed Default Reading Interventions

  ## Seed Data
  Insert four default interventions available to all schools:
  1. eenvoudiger boek - Simpler book
  2. ander onderwerp - Different topic
  3. luisterboek - Audio book
  4. leestijd uitbreiden - Extend reading time
*/

-- Insert default interventions
INSERT INTO reading_interventions (title, is_default, sort_order)
VALUES 
  ('eenvoudiger boek', true, 1),
  ('ander onderwerp', true, 2),
  ('luisterboek', true, 3),
  ('leestijd uitbreiden', true, 4);