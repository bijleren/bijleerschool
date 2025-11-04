/*
  # Make Follow-up Action Date Optional

  1. Changes
    - Modify `behavior_incident_followup_acties` table
    - Change `action_date` column from NOT NULL to allow NULL values
    - This allows adding follow-up consequences when creating an incident without requiring a date upfront
    - Date can be added later when the follow-up action is actually performed
*/

-- Make action_date nullable in behavior_incident_followup_acties
ALTER TABLE behavior_incident_followup_acties 
ALTER COLUMN action_date DROP NOT NULL;