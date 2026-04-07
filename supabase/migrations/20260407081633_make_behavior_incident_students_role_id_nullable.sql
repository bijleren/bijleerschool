/*
  # Make role_id nullable in behavior_incident_students

  ## Changes
  - `behavior_incident_students.role_id`: Changed from NOT NULL to nullable

  ## Reason
  When no student roles are configured for a school, the form cannot supply
  a valid role_id UUID, causing a NOT NULL violation. Making it nullable
  allows incidents to be created even when roles are not yet set up.
*/

ALTER TABLE behavior_incident_students ALTER COLUMN role_id DROP NOT NULL;
