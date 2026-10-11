/*
  # archive_student(p_student_id)

  Verwijderen van een leerling = is_active op false zetten; de trigger
  trg_archive_student_on_deactivate verplaatst de rij dan naar de
  archiefschool. Een leerkracht mag die archiefrij niet meer lezen, en
  PostgREST vraagt bij een UPDATE altijd de rij terug (RETURNING), waardoor
  de database de wijziging weigert. Enkel platformbeheerders (die alles
  mogen lezen) konden daardoor leerlingen verwijderen.

  Deze functie doet de update met de rechten van de eigenaar, na dezelfde
  controle als de policy "coach updates school students": de gebruiker is
  actief lid van de school van de leerling.
*/
CREATE OR REPLACE FUNCTION public.archive_student(p_student_id uuid)
  RETURNS void
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = ''
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.students s
    JOIN public.user_schools us ON us.school_id = s.school_id
    WHERE s.id = p_student_id
      AND s.is_active = true
      AND us.user_id = auth.uid()
      AND us.is_active = true
  ) THEN
    RAISE EXCEPTION 'Leerling niet gevonden of geen toegang' USING ERRCODE = '42501';
  END IF;

  UPDATE public.students SET is_active = false WHERE id = p_student_id;
END;
$$;

REVOKE ALL ON FUNCTION public.archive_student(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.archive_student(uuid) TO authenticated;
