
-- Book tag definitions (per school)
CREATE TABLE public.book_tag_definitions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  name text NOT NULL,
  color text NOT NULL DEFAULT '#3B82F6',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(school_id, name)
);

ALTER TABLE public.book_tag_definitions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "select_book_tags" ON public.book_tag_definitions FOR SELECT
  TO authenticated USING (
    school_id IN (
      SELECT school_id FROM public.user_schools
      WHERE user_id = auth.uid() AND is_active = true AND status = 'approved'
    )
  );

CREATE POLICY "insert_book_tags" ON public.book_tag_definitions FOR INSERT
  TO authenticated WITH CHECK (
    school_id IN (
      SELECT school_id FROM public.user_schools
      WHERE user_id = auth.uid() AND is_active = true AND status = 'approved'
    )
  );

CREATE POLICY "update_book_tags" ON public.book_tag_definitions FOR UPDATE
  TO authenticated USING (
    school_id IN (
      SELECT school_id FROM public.user_schools
      WHERE user_id = auth.uid() AND is_active = true AND status = 'approved'
    )
  ) WITH CHECK (
    school_id IN (
      SELECT school_id FROM public.user_schools
      WHERE user_id = auth.uid() AND is_active = true AND status = 'approved'
    )
  );

CREATE POLICY "delete_book_tags" ON public.book_tag_definitions FOR DELETE
  TO authenticated USING (
    school_id IN (
      SELECT school_id FROM public.user_schools
      WHERE user_id = auth.uid() AND is_active = true AND status = 'approved'
    )
  );

CREATE INDEX idx_book_tag_definitions_school_id ON public.book_tag_definitions(school_id);

-- Book tag assignments (junction table)
CREATE TABLE public.book_tag_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  book_id uuid NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
  tag_id uuid NOT NULL REFERENCES public.book_tag_definitions(id) ON DELETE CASCADE,
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(book_id, tag_id)
);

ALTER TABLE public.book_tag_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "select_book_tag_assignments" ON public.book_tag_assignments FOR SELECT
  TO authenticated USING (
    school_id IN (
      SELECT school_id FROM public.user_schools
      WHERE user_id = auth.uid() AND is_active = true AND status = 'approved'
    )
  );

CREATE POLICY "insert_book_tag_assignments" ON public.book_tag_assignments FOR INSERT
  TO authenticated WITH CHECK (
    school_id IN (
      SELECT school_id FROM public.user_schools
      WHERE user_id = auth.uid() AND is_active = true AND status = 'approved'
    )
  );

CREATE POLICY "update_book_tag_assignments" ON public.book_tag_assignments FOR UPDATE
  TO authenticated USING (
    school_id IN (
      SELECT school_id FROM public.user_schools
      WHERE user_id = auth.uid() AND is_active = true AND status = 'approved'
    )
  ) WITH CHECK (
    school_id IN (
      SELECT school_id FROM public.user_schools
      WHERE user_id = auth.uid() AND is_active = true AND status = 'approved'
    )
  );

CREATE POLICY "delete_book_tag_assignments" ON public.book_tag_assignments FOR DELETE
  TO authenticated USING (
    school_id IN (
      SELECT school_id FROM public.user_schools
      WHERE user_id = auth.uid() AND is_active = true AND status = 'approved'
    )
  );

CREATE INDEX idx_book_tag_assignments_book_id ON public.book_tag_assignments(book_id);
CREATE INDEX idx_book_tag_assignments_tag_id ON public.book_tag_assignments(tag_id);
CREATE INDEX idx_book_tag_assignments_school_id ON public.book_tag_assignments(school_id);
