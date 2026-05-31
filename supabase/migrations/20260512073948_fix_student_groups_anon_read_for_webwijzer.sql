/*
  # Fix student_groups anon read for WebWijzer student access

  ## Problem
  Students access WebWijzer as anonymous (anon) users via a public URL with access hash.
  The StudentWebWijzer component queries student_groups to find which groups a student
  belongs to, so it can resolve group-based content assignments.

  The existing "student reads own student_groups" policy uses current_student_id() which
  reads student_id from the JWT claims — but anon students have no JWT, so this always
  returns null and the query returns no rows. As a result, group-assigned content never
  appears for students.

  ## Fix
  Add an anon SELECT policy that allows reading student_groups rows where the student_id
  matches a student that is publicly readable (i.e., exists in the students table with
  is_active = true). This mirrors the existing public read access on the students table.

  ## Security
  - Only allows reading group membership for active students
  - Does not expose any write capabilities
  - Does not expose data for inactive/deleted students
*/

-- Drop the old "Public can read student groups" policy if it exists (was USING(true), too broad)
DROP POLICY IF EXISTS "Public can read student groups" ON student_groups;

-- Add a scoped anon policy: only readable for active students
CREATE POLICY "Anon can read student_groups for active students"
  ON student_groups
  FOR SELECT
  TO anon
  USING (
    EXISTS (
      SELECT 1 FROM students s
      WHERE s.id = student_groups.student_id
        AND s.is_active = true
    )
  );
