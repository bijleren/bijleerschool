/*
  # Fix groups table RLS — add missing write policies

  ## Problem
  The groups table only has a SELECT policy. INSERT, UPDATE, and DELETE
  policies were never added, so teachers cannot create or manage groups.

  ## Changes
  - Add INSERT policy: school members can create groups in their school
  - Add UPDATE policy: school members can update groups in their school
  - Add DELETE policy: school members can delete groups in their school
*/

CREATE POLICY "School members can insert groups"
  ON public.groups FOR INSERT
  TO authenticated
  WITH CHECK (
    school_id IN (
      SELECT school_id FROM user_schools
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

CREATE POLICY "School members can update groups"
  ON public.groups FOR UPDATE
  TO authenticated
  USING (
    school_id IN (
      SELECT school_id FROM user_schools
      WHERE user_id = auth.uid() AND is_active = true
    )
  )
  WITH CHECK (
    school_id IN (
      SELECT school_id FROM user_schools
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

CREATE POLICY "School members can delete groups"
  ON public.groups FOR DELETE
  TO authenticated
  USING (
    school_id IN (
      SELECT school_id FROM user_schools
      WHERE user_id = auth.uid() AND is_active = true
    )
  );
