/*
  # Reorganize Sporen Fields to Spoor Level
  
  ## Overview
  Moves coach and guidance fields from individual student assignments to the spoor level,
  as these apply to the entire spoor/track rather than individual students.
  
  ## Changes to student_spoor_assignments
  - Remove begeleiding_klas (moved to spoor_notes)
  - Remove begeleiding_thuis (moved to spoor_notes)
  - Remove evaluatie (moved to spoor_notes)
  - Remove team_member_id (moved to spoor_notes)
  - Keep needs_attention (this is student-specific)
  
  ## Changes to spoor_notes
  - Add team_member_id (uuid) - coach responsible for this spoor
  - Add begeleiding_klas (text) - classroom guidance for this spoor
  - Add begeleiding_thuis (text) - home guidance for this spoor
  - Add evaluatie (text) - evaluation notes for this spoor
  
  ## Rationale
  The coach, guidance strategies, and evaluation apply to the entire spoor/track
  and how it's taught, not to individual students. Individual students only need
  to be flagged for attention when they need extra help.
*/

-- Remove fields from student_spoor_assignments that should be at spoor level
ALTER TABLE student_spoor_assignments 
DROP COLUMN IF EXISTS begeleiding_klas,
DROP COLUMN IF EXISTS begeleiding_thuis,
DROP COLUMN IF EXISTS evaluatie,
DROP COLUMN IF EXISTS team_member_id;

-- Add fields to spoor_notes for spoor-level information
ALTER TABLE spoor_notes
ADD COLUMN IF NOT EXISTS team_member_id uuid REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS begeleiding_klas text DEFAULT '',
ADD COLUMN IF NOT EXISTS begeleiding_thuis text DEFAULT '',
ADD COLUMN IF NOT EXISTS evaluatie text DEFAULT '';

-- Create index for team_member queries
CREATE INDEX IF NOT EXISTS idx_spoor_notes_team_member 
ON spoor_notes(team_member_id);