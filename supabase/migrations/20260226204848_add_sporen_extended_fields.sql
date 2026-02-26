/*
  # Extend Sporen System with Additional Fields
  
  ## Overview
  Adds comprehensive support fields to the student_spoor_assignments table
  to enable detailed tracking and reporting of student support.
  
  ## Changes to student_spoor_assignments
  
  ### New Columns
  1. **begeleiding_klas** (text)
     - Description of support provided in the classroom
     - Allows teachers to document in-class interventions and support strategies
  
  2. **begeleiding_thuis** (text)
     - Description of support provided at home
     - Documents home-based strategies and parent involvement
  
  3. **evaluatie** (text)
     - Evaluation notes for the student's progress on this spoor
     - Allows tracking of outcomes and adjustments needed
  
  4. **team_member_id** (uuid, foreign key)
     - Links to auth.users table
     - Identifies the team member (teacher/admin) responsible for this student's spoor
  
  5. **needs_attention** (boolean)
     - Flag to mark students requiring immediate attention
     - Defaults to false
     - Useful for priority management and intervention planning
  
  ## Indexes
  - Add index on team_member_id for efficient filtering by responsible teacher
  - Add index on needs_attention for quick priority student queries
  
  ## Security
  - Existing RLS policies automatically apply to new columns
  - Users can only access/modify assignments for students in their approved schools
*/

-- Add new columns to student_spoor_assignments
ALTER TABLE student_spoor_assignments 
ADD COLUMN IF NOT EXISTS begeleiding_klas text DEFAULT '',
ADD COLUMN IF NOT EXISTS begeleiding_thuis text DEFAULT '',
ADD COLUMN IF NOT EXISTS evaluatie text DEFAULT '',
ADD COLUMN IF NOT EXISTS team_member_id uuid REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS needs_attention boolean NOT NULL DEFAULT false;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_student_spoor_assignments_team_member 
ON student_spoor_assignments(team_member_id);

CREATE INDEX IF NOT EXISTS idx_student_spoor_assignments_needs_attention 
ON student_spoor_assignments(needs_attention) WHERE needs_attention = true;