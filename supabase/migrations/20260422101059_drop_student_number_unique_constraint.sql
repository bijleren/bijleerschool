/*
  # Remove unique constraint on student number per school

  ## Change
  - Drops the UNIQUE(school_id, student_number) constraint from the `students` table

  ## Reason
  Students can share the same student number across different classes within the same school.
  The old constraint incorrectly prevented this scenario.
*/

ALTER TABLE students DROP CONSTRAINT IF EXISTS students_school_id_student_number_key;
