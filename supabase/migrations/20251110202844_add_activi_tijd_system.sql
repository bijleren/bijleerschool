-- # Activi-Tijd Activity Board System
--
-- 1. New Tables
--   - activity_boards: Main board configurations with name, description, school link
--   - activity_options: Predefined activities with max students, color, icon
--   - activity_sessions: Track student participation with start/end times and feedback
--   - activity_collaboration_logs: Track which students work together and for how long
--   - activity_board_access: Control which teachers and groups can manage boards
--   - activity_board_timeblocks: Link boards to specific schedule time blocks
--
-- 2. Security
--   - Enable RLS on all tables
--   - Policies for school members to manage their boards
--   - Policies for viewing active sessions and analytics
--
-- 3. Indexes
--   - Performance indexes for common queries

-- Create activity_boards table
CREATE TABLE IF NOT EXISTS activity_boards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  is_active boolean DEFAULT true,
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create activity_options table
CREATE TABLE IF NOT EXISTS activity_options (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id uuid NOT NULL REFERENCES activity_boards(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  max_students integer,
  color text NOT NULL DEFAULT '#6B7280',
  icon text NOT NULL DEFAULT 'Grid',
  sort_order integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create activity_sessions table
CREATE TABLE IF NOT EXISTS activity_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id uuid NOT NULL REFERENCES activity_boards(id) ON DELETE CASCADE,
  activity_option_id uuid NOT NULL REFERENCES activity_options(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  start_time timestamptz NOT NULL DEFAULT now(),
  end_time timestamptz,
  feedback_rating integer CHECK (feedback_rating >= 1 AND feedback_rating <= 5),
  teacher_notes text,
  added_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now()
);

-- Create activity_collaboration_logs table
CREATE TABLE IF NOT EXISTS activity_collaboration_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id_1 uuid NOT NULL REFERENCES activity_sessions(id) ON DELETE CASCADE,
  session_id_2 uuid NOT NULL REFERENCES activity_sessions(id) ON DELETE CASCADE,
  activity_option_id uuid NOT NULL REFERENCES activity_options(id) ON DELETE CASCADE,
  start_time timestamptz NOT NULL,
  end_time timestamptz NOT NULL,
  duration_minutes integer NOT NULL,
  created_at timestamptz DEFAULT now(),
  CHECK (session_id_1 < session_id_2)
);

-- Create activity_board_access table
CREATE TABLE IF NOT EXISTS activity_board_access (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id uuid NOT NULL REFERENCES activity_boards(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  group_id uuid REFERENCES groups(id) ON DELETE CASCADE,
  access_type text NOT NULL CHECK (access_type IN ('teacher', 'group')),
  created_at timestamptz DEFAULT now(),
  CHECK (
    (access_type = 'teacher' AND user_id IS NOT NULL AND group_id IS NULL) OR
    (access_type = 'group' AND group_id IS NOT NULL AND user_id IS NULL)
  )
);

-- Create activity_board_timeblocks table
CREATE TABLE IF NOT EXISTS activity_board_timeblocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id uuid NOT NULL REFERENCES activity_boards(id) ON DELETE CASCADE,
  template_block_id uuid NOT NULL REFERENCES day_template_blocks(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(board_id, template_block_id)
);

-- Enable RLS on all tables
ALTER TABLE activity_boards ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_collaboration_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_board_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_board_timeblocks ENABLE ROW LEVEL SECURITY;

-- Policies for activity_boards
CREATE POLICY "School members can view boards"
  ON activity_boards FOR SELECT
  TO authenticated
  USING (school_id IN (
    SELECT user_schools.school_id
    FROM user_schools
    WHERE user_schools.user_id = auth.uid()
      AND user_schools.status = 'approved'
      AND user_schools.is_active = true
  ));

CREATE POLICY "School members can create boards"
  ON activity_boards FOR INSERT
  TO authenticated
  WITH CHECK (school_id IN (
    SELECT user_schools.school_id
    FROM user_schools
    WHERE user_schools.user_id = auth.uid()
      AND user_schools.status = 'approved'
      AND user_schools.is_active = true
  ));

CREATE POLICY "Board creators can update their boards"
  ON activity_boards FOR UPDATE
  TO authenticated
  USING (
    created_by = auth.uid() OR
    school_id IN (
      SELECT user_schools.school_id
      FROM user_schools
      WHERE user_schools.user_id = auth.uid()
        AND user_schools.status = 'approved'
        AND user_schools.is_active = true
        AND user_schools.role = 'admin'
    )
  )
  WITH CHECK (
    created_by = auth.uid() OR
    school_id IN (
      SELECT user_schools.school_id
      FROM user_schools
      WHERE user_schools.user_id = auth.uid()
        AND user_schools.status = 'approved'
        AND user_schools.is_active = true
        AND user_schools.role = 'admin'
    )
  );

CREATE POLICY "Board creators can delete their boards"
  ON activity_boards FOR DELETE
  TO authenticated
  USING (
    created_by = auth.uid() OR
    school_id IN (
      SELECT user_schools.school_id
      FROM user_schools
      WHERE user_schools.user_id = auth.uid()
        AND user_schools.status = 'approved'
        AND user_schools.is_active = true
        AND user_schools.role = 'admin'
    )
  );

-- Policies for activity_options
CREATE POLICY "Users can view options for boards they can access"
  ON activity_options FOR SELECT
  TO authenticated
  USING (board_id IN (
    SELECT ab.id FROM activity_boards ab
    WHERE ab.school_id IN (
      SELECT user_schools.school_id
      FROM user_schools
      WHERE user_schools.user_id = auth.uid()
        AND user_schools.status = 'approved'
        AND user_schools.is_active = true
    )
  ));

CREATE POLICY "Users can manage options for their boards"
  ON activity_options FOR ALL
  TO authenticated
  USING (board_id IN (
    SELECT ab.id FROM activity_boards ab
    WHERE ab.created_by = auth.uid()
    OR ab.school_id IN (
      SELECT user_schools.school_id
      FROM user_schools
      WHERE user_schools.user_id = auth.uid()
        AND user_schools.status = 'approved'
        AND user_schools.is_active = true
        AND user_schools.role = 'admin'
    )
  ))
  WITH CHECK (board_id IN (
    SELECT ab.id FROM activity_boards ab
    WHERE ab.created_by = auth.uid()
    OR ab.school_id IN (
      SELECT user_schools.school_id
      FROM user_schools
      WHERE user_schools.user_id = auth.uid()
        AND user_schools.status = 'approved'
        AND user_schools.is_active = true
        AND user_schools.role = 'admin'
    )
  ));

-- Policies for activity_sessions
CREATE POLICY "Users can view sessions for their school boards"
  ON activity_sessions FOR SELECT
  TO authenticated
  USING (board_id IN (
    SELECT ab.id FROM activity_boards ab
    WHERE ab.school_id IN (
      SELECT user_schools.school_id
      FROM user_schools
      WHERE user_schools.user_id = auth.uid()
        AND user_schools.status = 'approved'
        AND user_schools.is_active = true
    )
  ));

CREATE POLICY "Users can create sessions for accessible boards"
  ON activity_sessions FOR INSERT
  TO authenticated
  WITH CHECK (board_id IN (
    SELECT ab.id FROM activity_boards ab
    WHERE ab.school_id IN (
      SELECT user_schools.school_id
      FROM user_schools
      WHERE user_schools.user_id = auth.uid()
        AND user_schools.status = 'approved'
        AND user_schools.is_active = true
    )
  ));

CREATE POLICY "Users can update sessions they created or for their school"
  ON activity_sessions FOR UPDATE
  TO authenticated
  USING (
    added_by = auth.uid() OR
    board_id IN (
      SELECT ab.id FROM activity_boards ab
      WHERE ab.school_id IN (
        SELECT user_schools.school_id
        FROM user_schools
        WHERE user_schools.user_id = auth.uid()
          AND user_schools.status = 'approved'
          AND user_schools.is_active = true
      )
    )
  )
  WITH CHECK (
    added_by = auth.uid() OR
    board_id IN (
      SELECT ab.id FROM activity_boards ab
      WHERE ab.school_id IN (
        SELECT user_schools.school_id
        FROM user_schools
        WHERE user_schools.user_id = auth.uid()
          AND user_schools.status = 'approved'
          AND user_schools.is_active = true
      )
    )
  );

-- Policies for activity_collaboration_logs
CREATE POLICY "Users can view collaboration logs for their school"
  ON activity_collaboration_logs FOR SELECT
  TO authenticated
  USING (activity_option_id IN (
    SELECT ao.id FROM activity_options ao
    INNER JOIN activity_boards ab ON ao.board_id = ab.id
    WHERE ab.school_id IN (
      SELECT user_schools.school_id
      FROM user_schools
      WHERE user_schools.user_id = auth.uid()
        AND user_schools.status = 'approved'
        AND user_schools.is_active = true
    )
  ));

CREATE POLICY "System can create collaboration logs"
  ON activity_collaboration_logs FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Policies for activity_board_access
CREATE POLICY "Users can view access for boards they manage"
  ON activity_board_access FOR SELECT
  TO authenticated
  USING (board_id IN (
    SELECT ab.id FROM activity_boards ab
    WHERE ab.created_by = auth.uid()
    OR ab.school_id IN (
      SELECT user_schools.school_id
      FROM user_schools
      WHERE user_schools.user_id = auth.uid()
        AND user_schools.status = 'approved'
        AND user_schools.is_active = true
    )
  ));

CREATE POLICY "Board creators can manage access"
  ON activity_board_access FOR ALL
  TO authenticated
  USING (board_id IN (
    SELECT ab.id FROM activity_boards ab
    WHERE ab.created_by = auth.uid()
    OR ab.school_id IN (
      SELECT user_schools.school_id
      FROM user_schools
      WHERE user_schools.user_id = auth.uid()
        AND user_schools.status = 'approved'
        AND user_schools.is_active = true
        AND user_schools.role = 'admin'
    )
  ))
  WITH CHECK (board_id IN (
    SELECT ab.id FROM activity_boards ab
    WHERE ab.created_by = auth.uid()
    OR ab.school_id IN (
      SELECT user_schools.school_id
      FROM user_schools
      WHERE user_schools.user_id = auth.uid()
        AND user_schools.status = 'approved'
        AND user_schools.is_active = true
        AND user_schools.role = 'admin'
    )
  ));

-- Policies for activity_board_timeblocks
CREATE POLICY "Users can view timeblocks for their school boards"
  ON activity_board_timeblocks FOR SELECT
  TO authenticated
  USING (board_id IN (
    SELECT ab.id FROM activity_boards ab
    WHERE ab.school_id IN (
      SELECT user_schools.school_id
      FROM user_schools
      WHERE user_schools.user_id = auth.uid()
        AND user_schools.status = 'approved'
        AND user_schools.is_active = true
    )
  ));

CREATE POLICY "Board managers can manage timeblocks"
  ON activity_board_timeblocks FOR ALL
  TO authenticated
  USING (board_id IN (
    SELECT ab.id FROM activity_boards ab
    WHERE ab.created_by = auth.uid()
    OR ab.school_id IN (
      SELECT user_schools.school_id
      FROM user_schools
      WHERE user_schools.user_id = auth.uid()
        AND user_schools.status = 'approved'
        AND user_schools.is_active = true
        AND user_schools.role = 'admin'
    )
  ))
  WITH CHECK (board_id IN (
    SELECT ab.id FROM activity_boards ab
    WHERE ab.created_by = auth.uid()
    OR ab.school_id IN (
      SELECT user_schools.school_id
      FROM user_schools
      WHERE user_schools.user_id = auth.uid()
        AND user_schools.status = 'approved'
        AND user_schools.is_active = true
        AND user_schools.role = 'admin'
    )
  ));

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_activity_boards_school_id ON activity_boards(school_id);
CREATE INDEX IF NOT EXISTS idx_activity_boards_created_by ON activity_boards(created_by);
CREATE INDEX IF NOT EXISTS idx_activity_options_board_id ON activity_options(board_id);
CREATE INDEX IF NOT EXISTS idx_activity_sessions_board_id ON activity_sessions(board_id);
CREATE INDEX IF NOT EXISTS idx_activity_sessions_student_id ON activity_sessions(student_id);
CREATE INDEX IF NOT EXISTS idx_activity_sessions_activity_option_id ON activity_sessions(activity_option_id);
CREATE INDEX IF NOT EXISTS idx_activity_sessions_active ON activity_sessions(board_id) WHERE end_time IS NULL;
CREATE INDEX IF NOT EXISTS idx_activity_sessions_time_range ON activity_sessions(start_time, end_time);
CREATE INDEX IF NOT EXISTS idx_activity_collaboration_logs_sessions ON activity_collaboration_logs(session_id_1, session_id_2);
CREATE INDEX IF NOT EXISTS idx_activity_collaboration_logs_activity ON activity_collaboration_logs(activity_option_id);
CREATE INDEX IF NOT EXISTS idx_activity_board_access_board_id ON activity_board_access(board_id);
CREATE INDEX IF NOT EXISTS idx_activity_board_access_user_id ON activity_board_access(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_board_access_group_id ON activity_board_access(group_id);
CREATE INDEX IF NOT EXISTS idx_activity_board_timeblocks_board_id ON activity_board_timeblocks(board_id);
CREATE INDEX IF NOT EXISTS idx_activity_board_timeblocks_template_block_id ON activity_board_timeblocks(template_block_id);

-- Create triggers for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_activity_boards_updated_at') THEN
    CREATE TRIGGER update_activity_boards_updated_at
      BEFORE UPDATE ON activity_boards
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_activity_options_updated_at') THEN
    CREATE TRIGGER update_activity_options_updated_at
      BEFORE UPDATE ON activity_options
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;