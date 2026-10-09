-- Per-school switch for the Zoeker in the student WebWijzer. Off by default.
alter table public.schools add column if not exists zoeker_enabled boolean not null default false;

-- The WebWijzer profile now also tells whether the Zoeker is on for the student's school.
create or replace function public.webwijzer_student_profile(p_hash text)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare v_id uuid := public.webwijzer_student_id(p_hash); v jsonb;
begin
  if v_id is null then return null; end if;
  select jsonb_build_object('id', s.id, 'first_name', s.first_name, 'school_id', s.school_id,
           'premium_school', sc.premium_school,
           'zoeker_enabled', coalesce(sc.zoeker_enabled, false),
           'has_books', exists (select 1 from public.books b where b.school_id = s.school_id))
    into v
  from public.students s left join public.schools sc on sc.id = s.school_id
  where s.id = v_id;
  return v;
end; $$;
