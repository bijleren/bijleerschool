-- Allow school members to delete tag log entries for their students
CREATE POLICY "delete_own_school_tag_log" ON student_tag_log
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM students s
      JOIN user_schools us ON us.school_id = s.school_id
      WHERE s.id = student_tag_log.student_id
        AND us.user_id = auth.uid()
    )
  );
