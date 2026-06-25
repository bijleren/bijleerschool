-- Hulpfiches: uploadable reference sheets linked to subjects, grades, students/groups

CREATE TABLE hulpfiches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  file_url text,
  file_name text,
  file_size bigint,
  file_type text,
  is_visible_to_students boolean NOT NULL DEFAULT false,
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Junction: hulpfiche ↔ subject name (free text, matches subjects.name)
CREATE TABLE hulpfiche_vakken (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fiche_id uuid NOT NULL REFERENCES hulpfiches(id) ON DELETE CASCADE,
  vak_name text NOT NULL,
  UNIQUE(fiche_id, vak_name)
);

-- Junction: hulpfiche ↔ leerjaar (free text)
CREATE TABLE hulpfiche_leerjaren (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fiche_id uuid NOT NULL REFERENCES hulpfiches(id) ON DELETE CASCADE,
  leerjaar text NOT NULL,
  UNIQUE(fiche_id, leerjaar)
);

-- Assignments: assign a fiche to a student or group
CREATE TABLE hulpfiche_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fiche_id uuid NOT NULL REFERENCES hulpfiches(id) ON DELETE CASCADE,
  assignable_type text NOT NULL CHECK (assignable_type IN ('student', 'group')),
  assignable_id uuid NOT NULL,
  assigned_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(fiche_id, assignable_type, assignable_id)
);

CREATE INDEX ON hulpfiches (school_id);
CREATE INDEX ON hulpfiche_assignments (fiche_id);
CREATE INDEX ON hulpfiche_assignments (assignable_id);

-- updated_at trigger
CREATE OR REPLACE FUNCTION update_hulpfiches_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER hulpfiches_updated_at
  BEFORE UPDATE ON hulpfiches
  FOR EACH ROW EXECUTE FUNCTION update_hulpfiches_updated_at();

-- RLS
ALTER TABLE hulpfiches ENABLE ROW LEVEL SECURITY;
ALTER TABLE hulpfiche_vakken ENABLE ROW LEVEL SECURITY;
ALTER TABLE hulpfiche_leerjaren ENABLE ROW LEVEL SECURITY;
ALTER TABLE hulpfiche_assignments ENABLE ROW LEVEL SECURITY;

-- Helper: check if auth.uid() belongs to the school
CREATE OR REPLACE FUNCTION is_school_member_hf(p_school_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY INVOKER
STABLE
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_schools
    WHERE user_id = auth.uid()
      AND school_id = p_school_id
      AND status = 'approved'
      AND is_active = true
  );
$$;

-- hulpfiches policies
CREATE POLICY "select_hulpfiches" ON hulpfiches FOR SELECT
  TO authenticated USING (is_school_member_hf(school_id));

CREATE POLICY "insert_hulpfiches" ON hulpfiches FOR INSERT
  TO authenticated WITH CHECK (is_school_member_hf(school_id) AND auth.uid() = created_by);

CREATE POLICY "update_hulpfiches" ON hulpfiches FOR UPDATE
  TO authenticated USING (is_school_member_hf(school_id)) WITH CHECK (is_school_member_hf(school_id));

CREATE POLICY "delete_hulpfiches" ON hulpfiches FOR DELETE
  TO authenticated USING (is_school_member_hf(school_id));

-- hulpfiche_vakken policies (inherit access via fiche)
CREATE POLICY "select_hulpfiche_vakken" ON hulpfiche_vakken FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM public.hulpfiches h WHERE h.id = fiche_id AND is_school_member_hf(h.school_id))
  );

CREATE POLICY "insert_hulpfiche_vakken" ON hulpfiche_vakken FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM public.hulpfiches h WHERE h.id = fiche_id AND is_school_member_hf(h.school_id))
  );

CREATE POLICY "delete_hulpfiche_vakken" ON hulpfiche_vakken FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM public.hulpfiches h WHERE h.id = fiche_id AND is_school_member_hf(h.school_id))
  );

CREATE POLICY "update_hulpfiche_vakken" ON hulpfiche_vakken FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM public.hulpfiches h WHERE h.id = fiche_id AND is_school_member_hf(h.school_id))
  );

-- hulpfiche_leerjaren policies
CREATE POLICY "select_hulpfiche_leerjaren" ON hulpfiche_leerjaren FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM public.hulpfiches h WHERE h.id = fiche_id AND is_school_member_hf(h.school_id))
  );

CREATE POLICY "insert_hulpfiche_leerjaren" ON hulpfiche_leerjaren FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM public.hulpfiches h WHERE h.id = fiche_id AND is_school_member_hf(h.school_id))
  );

CREATE POLICY "delete_hulpfiche_leerjaren" ON hulpfiche_leerjaren FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM public.hulpfiches h WHERE h.id = fiche_id AND is_school_member_hf(h.school_id))
  );

CREATE POLICY "update_hulpfiche_leerjaren" ON hulpfiche_leerjaren FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM public.hulpfiches h WHERE h.id = fiche_id AND is_school_member_hf(h.school_id))
  );

-- hulpfiche_assignments policies
CREATE POLICY "select_hulpfiche_assignments" ON hulpfiche_assignments FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM public.hulpfiches h WHERE h.id = fiche_id AND is_school_member_hf(h.school_id))
  );

CREATE POLICY "insert_hulpfiche_assignments" ON hulpfiche_assignments FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM public.hulpfiches h WHERE h.id = fiche_id AND is_school_member_hf(h.school_id))
    AND auth.uid() = assigned_by
  );

CREATE POLICY "delete_hulpfiche_assignments" ON hulpfiche_assignments FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM public.hulpfiches h WHERE h.id = fiche_id AND is_school_member_hf(h.school_id))
  );

CREATE POLICY "update_hulpfiche_assignments" ON hulpfiche_assignments FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM public.hulpfiches h WHERE h.id = fiche_id AND is_school_member_hf(h.school_id))
  );

-- Anon/student access: read fiches that are visible + assigned to their student id or their group
CREATE POLICY "anon_select_hulpfiches" ON hulpfiches FOR SELECT
  TO anon USING (is_visible_to_students = true);

CREATE POLICY "anon_select_hulpfiche_vakken" ON hulpfiche_vakken FOR SELECT
  TO anon USING (
    EXISTS (SELECT 1 FROM public.hulpfiches h WHERE h.id = fiche_id AND h.is_visible_to_students = true)
  );

CREATE POLICY "anon_select_hulpfiche_leerjaren" ON hulpfiche_leerjaren FOR SELECT
  TO anon USING (
    EXISTS (SELECT 1 FROM public.hulpfiches h WHERE h.id = fiche_id AND h.is_visible_to_students = true)
  );

CREATE POLICY "anon_select_hulpfiche_assignments" ON hulpfiche_assignments FOR SELECT
  TO anon USING (
    EXISTS (SELECT 1 FROM public.hulpfiches h WHERE h.id = fiche_id AND h.is_visible_to_students = true)
  );

-- Storage bucket for hulpfiches files
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'hulpfiches-files',
  'hulpfiches-files',
  true,
  20971520,
  ARRAY[
    'application/pdf',
    'image/jpeg', 'image/png', 'image/webp', 'image/gif',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation'
  ]
);

CREATE POLICY "hulpfiches_files_upload" ON storage.objects FOR INSERT
  TO authenticated WITH CHECK (bucket_id = 'hulpfiches-files');

CREATE POLICY "hulpfiches_files_public_read" ON storage.objects FOR SELECT
  TO public USING (bucket_id = 'hulpfiches-files');

CREATE POLICY "hulpfiches_files_update" ON storage.objects FOR UPDATE
  TO authenticated USING (bucket_id = 'hulpfiches-files' AND auth.uid() = owner);

CREATE POLICY "hulpfiches_files_delete" ON storage.objects FOR DELETE
  TO authenticated USING (bucket_id = 'hulpfiches-files' AND auth.uid() = owner);
