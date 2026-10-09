-- WebWijzer: server-side functions for the student flow, keyed on the student's access_hash.
--
-- Additive only. The existing anon policies on students / webwijzer_* stay in place for now,
-- so older clients keep working. Once the web frontend uses these functions everywhere, a
-- follow-up migration can drop the open anon policies.
--
-- Behaviour mirrors StudentWebWijzer.tsx exactly:
--   * assignments = direct (student) + via any student_groups row (no is_active filter, as before)
--   * clicks_used is counted on the assignment row; reaching click_limit archives it
--   * push_completed is set on the assignment row

-- Internal helper: hash -> active student id. Not callable by clients.
create or replace function public.webwijzer_student_id(p_hash text)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select s.id
  from public.students s
  where s.access_hash = trim(p_hash)
    and s.access_hash is not null
    and s.access_hash <> ''
    and s.is_active = true
  limit 1;
$$;
revoke all on function public.webwijzer_student_id(text) from public, anon, authenticated;

-- Internal helper: may this student see this assignment?
create or replace function public.webwijzer_student_has_assignment(p_student_id uuid, p_assignment_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.webwijzer_assignments a
    where a.id = p_assignment_id
      and (
        (a.assignable_type = 'student' and a.assignable_id = p_student_id)
        or (a.assignable_type = 'group' and a.assignable_id in (
              select sg.group_id from public.student_groups sg where sg.student_id = p_student_id))
      )
  );
$$;
revoke all on function public.webwijzer_student_has_assignment(uuid, uuid) from public, anon, authenticated;

-- Profile: what StudentWebWijzer needs about the student and the school.
create or replace function public.webwijzer_student_profile(p_hash text)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_id uuid := public.webwijzer_student_id(p_hash);
  v jsonb;
begin
  if v_id is null then return null; end if;
  select jsonb_build_object(
           'id', s.id,
           'first_name', s.first_name,
           'school_id', s.school_id,
           'premium_school', sc.premium_school,
           'has_books', exists (select 1 from public.books b where b.school_id = s.school_id)
         )
    into v
  from public.students s
  left join public.schools sc on sc.id = s.school_id
  where s.id = v_id;
  return v;
end;
$$;

-- Assignments in the same shape as the old PostgREST select (assignment + nested webwijzer_content).
create or replace function public.webwijzer_student_assignments(p_hash text)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_id uuid := public.webwijzer_student_id(p_hash);
begin
  if v_id is null then return null; end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object(
             'id', a.id,
             'is_push', a.is_push,
             'is_favorite', a.is_favorite,
             'is_archived', a.is_archived,
             'push_completed', a.push_completed,
             'clicks_used', a.clicks_used,
             'click_limit', a.click_limit,
             'webwijzer_content', jsonb_build_object(
               'id', c.id,
               'title', c.title,
               'content_type', c.content_type,
               'content_url', c.content_url,
               'symbol', c.symbol,
               'color', c.color,
               'has_date_limit', c.has_date_limit,
               'available_from', c.available_from,
               'available_until', c.available_until
             )) order by (a.assignable_type = 'group'), a.created_at)
    from public.webwijzer_assignments a
    join public.webwijzer_content c on c.id = a.content_id
    where (a.assignable_type = 'student' and a.assignable_id = v_id)
       or (a.assignable_type = 'group' and a.assignable_id in (
             select sg.group_id from public.student_groups sg where sg.student_id = v_id))
  ), '[]'::jsonb);
end;
$$;

-- Personal logins (student_logins) for the Logins button.
create or replace function public.webwijzer_student_logins(p_hash text)
returns table (id uuid, label text, url text, username text)
language sql
stable
security definer
set search_path = public
as $$
  select l.id, l.label, l.url, l.username
  from public.student_logins l
  where l.student_id = public.webwijzer_student_id(p_hash)
  order by l.created_at;
$$;

-- A click on content: log usage, count the click, archive when the click limit is reached.
create or replace function public.webwijzer_track_usage(p_hash text, p_assignment_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid := public.webwijzer_student_id(p_hash);
begin
  if v_id is null or not public.webwijzer_student_has_assignment(v_id, p_assignment_id) then
    return;
  end if;
  insert into public.webwijzer_usage (assignment_id, student_id) values (p_assignment_id, v_id);
  update public.webwijzer_assignments a
     set clicks_used = coalesce(a.clicks_used, 0) + 1,
         is_archived = a.is_archived
                       or (a.click_limit is not null and a.click_limit > 0
                           and coalesce(a.clicks_used, 0) + 1 >= a.click_limit)
   where a.id = p_assignment_id;
end;
$$;

-- A pushed item was opened.
create or replace function public.webwijzer_complete_push(p_hash text, p_assignment_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid := public.webwijzer_student_id(p_hash);
begin
  if v_id is null or not public.webwijzer_student_has_assignment(v_id, p_assignment_id) then
    return;
  end if;
  update public.webwijzer_assignments set push_completed = true where id = p_assignment_id;
end;
$$;

-- Login logging ('qr' or 'manual'), same table as before.
create or replace function public.webwijzer_log_access(p_hash text, p_method text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid := public.webwijzer_student_id(p_hash);
begin
  if v_id is null then return; end if;
  insert into public.webwijzer_access_log (student_id, access_method)
  values (v_id, case when p_method in ('qr', 'manual') then p_method else 'manual' end);
end;
$$;

revoke all on function public.webwijzer_student_profile(text) from public;
revoke all on function public.webwijzer_student_assignments(text) from public;
revoke all on function public.webwijzer_student_logins(text) from public;
revoke all on function public.webwijzer_track_usage(text, uuid) from public;
revoke all on function public.webwijzer_complete_push(text, uuid) from public;
revoke all on function public.webwijzer_log_access(text, text) from public;
grant execute on function public.webwijzer_student_profile(text) to anon, authenticated;
grant execute on function public.webwijzer_student_assignments(text) to anon, authenticated;
grant execute on function public.webwijzer_student_logins(text) to anon, authenticated;
grant execute on function public.webwijzer_track_usage(text, uuid) to anon, authenticated;
grant execute on function public.webwijzer_complete_push(text, uuid) to anon, authenticated;
grant execute on function public.webwijzer_log_access(text, text) to anon, authenticated;
