-- Videoleren: study tasks built around a (SchoolTV) video and its transcript.
--
-- Teachers (authenticated, via user_schools) manage tasks for their school; every teacher in
-- the school can see every task. Students never touch these tables directly: they go through
-- the SECURITY DEFINER functions below, which check the student's access_hash (same key as the
-- WebWijzer QR card) and whether the task is assigned to them and still open.
--
-- A task is open when status = 'gepubliceerd', closed_at is null and now() < deadline.
-- Closing early sets closed_at; reopening clears closed_at and sets a new deadline.

-- ---------------------------------------------------------------- helpers
create or replace function public.videoleren_new_share_code()
returns text
language plpgsql
volatile
set search_path = public
as $$
declare
  alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; -- no 0/O, 1/I
  code text;
begin
  loop
    code := '';
    for i in 1..8 loop
      code := code || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
    end loop;
    exit when not exists (select 1 from public.videoleren_tasks t where t.share_code = code);
  end loop;
  return code;
end;
$$;

-- ---------------------------------------------------------------- tables
create table public.videoleren_tasks (
  id                 uuid primary key default gen_random_uuid(),
  school_id          uuid not null references public.schools(id) on delete cascade,
  created_by         uuid references public.profiles(id) on delete set null default auth.uid(),
  title              text not null default '',
  video_url          text,
  embed_src          text,
  intro              text,
  info               text,
  info_on_paper      boolean not null default true,
  transcript_html    text not null default '',
  transcript_version integer not null default 1,
  layout             jsonb not null default '{}'::jsonb,
  min_keuze          integer not null default 0 check (min_keuze >= 0),
  status             text not null default 'concept'
                     check (status in ('concept', 'gepubliceerd', 'gearchiveerd')),
  deadline           timestamptz,
  closed_at          timestamptz,
  share_code         text not null unique,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  constraint videoleren_tasks_deadline_when_published
    check (status <> 'gepubliceerd' or deadline is not null)
);
create index videoleren_tasks_school_idx on public.videoleren_tasks (school_id);
create index videoleren_tasks_created_by_idx on public.videoleren_tasks (created_by);

create table public.videoleren_task_werkvormen (
  task_id    uuid not null references public.videoleren_tasks(id) on delete cascade,
  werkvorm   text not null check (werkvorm ~ '^[A-N]$'),
  required   boolean not null default true,
  sort_order integer not null default 0,
  options    jsonb not null default '{}'::jsonb,
  primary key (task_id, werkvorm)
);

create table public.videoleren_assignments (
  id              uuid primary key default gen_random_uuid(),
  task_id         uuid not null references public.videoleren_tasks(id) on delete cascade,
  assignable_type text not null check (assignable_type in ('student', 'group')),
  assignable_id   uuid not null,
  created_by      uuid references public.profiles(id) on delete set null default auth.uid(),
  created_at      timestamptz not null default now(),
  unique (task_id, assignable_type, assignable_id)
);
create index videoleren_assignments_target_idx on public.videoleren_assignments (assignable_type, assignable_id);

-- One row per student x task x werkvorm ('kijken' holds viewer state such as screenshots).
-- No scores or feedback: evaluation happens outside the app.
create table public.videoleren_progress (
  id                 uuid primary key default gen_random_uuid(),
  task_id            uuid not null references public.videoleren_tasks(id) on delete cascade,
  student_id         uuid not null references public.students(id) on delete cascade,
  werkvorm           text not null check (werkvorm ~ '^[A-N]$' or werkvorm = 'kijken'),
  status             text not null default 'bezig' check (status in ('bezig', 'klaar')),
  data               jsonb not null default '{}'::jsonb,
  transcript_version integer,
  started_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  completed_at       timestamptz,
  unique (task_id, student_id, werkvorm)
);
create index videoleren_progress_student_idx on public.videoleren_progress (student_id);

create table public.videoleren_files (
  id           uuid primary key default gen_random_uuid(),
  task_id      uuid not null references public.videoleren_tasks(id) on delete cascade,
  student_id   uuid not null references public.students(id) on delete cascade,
  werkvorm     text not null,
  kind         text not null check (kind in ('audio', 'image', 'sketch')),
  storage_path text not null unique,
  mime_type    text,
  size_bytes   bigint,
  created_at   timestamptz not null default now()
);
create index videoleren_files_task_student_idx on public.videoleren_files (task_id, student_id);

-- ---------------------------------------------------------------- triggers
create or replace function public.videoleren_tasks_before_write()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    if new.share_code is null or new.share_code = '' then
      new.share_code := public.videoleren_new_share_code();
    end if;
  else
    new.updated_at := now();
    if new.transcript_html is distinct from old.transcript_html then
      new.transcript_version := old.transcript_version + 1;
    end if;
    new.share_code := old.share_code; -- the printed QR code must never change
  end if;
  return new;
end;
$$;
create trigger videoleren_tasks_before_write
  before insert or update on public.videoleren_tasks
  for each row execute function public.videoleren_tasks_before_write();

-- ---------------------------------------------------------------- RLS: teachers
alter table public.videoleren_tasks enable row level security;
alter table public.videoleren_task_werkvormen enable row level security;
alter table public.videoleren_assignments enable row level security;
alter table public.videoleren_progress enable row level security;
alter table public.videoleren_files enable row level security;

create or replace function public.videoleren_my_school_ids()
returns setof uuid
language sql
stable
security definer
set search_path = public
as $$
  select us.school_id from public.user_schools us
  where us.user_id = auth.uid() and us.is_active = true;
$$;
revoke all on function public.videoleren_my_school_ids() from public, anon;
grant execute on function public.videoleren_my_school_ids() to authenticated;

create policy "school members manage videoleren tasks" on public.videoleren_tasks
  for all to authenticated
  using (school_id in (select public.videoleren_my_school_ids()))
  with check (school_id in (select public.videoleren_my_school_ids()));

create policy "school members manage videoleren werkvormen" on public.videoleren_task_werkvormen
  for all to authenticated
  using (task_id in (select t.id from public.videoleren_tasks t where t.school_id in (select public.videoleren_my_school_ids())))
  with check (task_id in (select t.id from public.videoleren_tasks t where t.school_id in (select public.videoleren_my_school_ids())));

create policy "school members read videoleren assignments" on public.videoleren_assignments
  for select to authenticated
  using (task_id in (select t.id from public.videoleren_tasks t where t.school_id in (select public.videoleren_my_school_ids())));

-- Only share with groups / students of the task's own school.
create policy "school members add videoleren assignments" on public.videoleren_assignments
  for insert to authenticated
  with check (
    exists (
      select 1 from public.videoleren_tasks t
      where t.id = task_id
        and t.school_id in (select public.videoleren_my_school_ids())
        and (
          (assignable_type = 'group' and exists (select 1 from public.groups g where g.id = assignable_id and g.school_id = t.school_id))
          or (assignable_type = 'student' and exists (select 1 from public.students s where s.id = assignable_id and s.school_id = t.school_id))
        )
    )
  );

create policy "school members remove videoleren assignments" on public.videoleren_assignments
  for delete to authenticated
  using (task_id in (select t.id from public.videoleren_tasks t where t.school_id in (select public.videoleren_my_school_ids())));

create policy "school members read videoleren progress" on public.videoleren_progress
  for select to authenticated
  using (task_id in (select t.id from public.videoleren_tasks t where t.school_id in (select public.videoleren_my_school_ids())));

create policy "school members read videoleren files" on public.videoleren_files
  for select to authenticated
  using (task_id in (select t.id from public.videoleren_tasks t where t.school_id in (select public.videoleren_my_school_ids())));

-- ---------------------------------------------------------------- student access (hash-based)
create or replace function public.videoleren_task_is_open(t public.videoleren_tasks)
returns boolean
language sql
stable
set search_path = public
as $$
  select t.status = 'gepubliceerd' and t.closed_at is null and t.deadline is not null and now() < t.deadline;
$$;

create or replace function public.videoleren_student_is_assigned(p_student_id uuid, p_task_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.videoleren_assignments a
    where a.task_id = p_task_id
      and ((a.assignable_type = 'student' and a.assignable_id = p_student_id)
        or (a.assignable_type = 'group' and a.assignable_id in (
              select sg.group_id from public.student_groups sg
              where sg.student_id = p_student_id and sg.is_active = true)))
  );
$$;
revoke all on function public.videoleren_student_is_assigned(uuid, uuid) from public, anon, authenticated;

-- Open tasks for the WebWijzer button: [] when none (button stays hidden).
create or replace function public.videoleren_student_tasks(p_hash text)
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
             'id', t.id,
             'title', t.title,
             'deadline', t.deadline,
             'werkvormen', (select count(*) from public.videoleren_task_werkvormen w where w.task_id = t.id),
             'klaar', (select count(*) from public.videoleren_progress p
                       where p.task_id = t.id and p.student_id = v_id and p.status = 'klaar' and p.werkvorm <> 'kijken'))
           order by t.deadline)
    from public.videoleren_tasks t
    where public.videoleren_task_is_open(t)
      and public.videoleren_student_is_assigned(v_id, t.id)
  ), '[]'::jsonb);
end;
$$;

-- The full task + this student's progress. Pass a task id, or the share_code from the printed QR.
-- Returns {status: ok | not_found | not_assigned | closed, ...}.
create or replace function public.videoleren_open_task(p_hash text, p_task_id uuid default null, p_share_code text default null)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_id uuid := public.webwijzer_student_id(p_hash);
  t public.videoleren_tasks;
begin
  if v_id is null then return jsonb_build_object('status', 'not_found'); end if;
  select * into t from public.videoleren_tasks
   where (p_task_id is not null and id = p_task_id)
      or (p_task_id is null and p_share_code is not null and share_code = upper(trim(p_share_code)))
   limit 1;
  if not found or t.status = 'concept' then return jsonb_build_object('status', 'not_found'); end if;
  if not public.videoleren_student_is_assigned(v_id, t.id) then
    return jsonb_build_object('status', 'not_assigned', 'title', t.title);
  end if;
  if not public.videoleren_task_is_open(t) then
    return jsonb_build_object('status', 'closed', 'title', t.title, 'deadline', t.deadline);
  end if;
  return jsonb_build_object(
    'status', 'ok',
    'student', (select jsonb_build_object('id', s.id, 'first_name', s.first_name) from public.students s where s.id = v_id),
    'task', jsonb_build_object(
      'id', t.id, 'title', t.title, 'video_url', t.video_url, 'embed_src', t.embed_src,
      'intro', t.intro, 'info', t.info, 'transcript_html', t.transcript_html,
      'transcript_version', t.transcript_version, 'layout', t.layout, 'min_keuze', t.min_keuze,
      'deadline', t.deadline, 'share_code', t.share_code),
    'werkvormen', coalesce((select jsonb_agg(jsonb_build_object('werkvorm', w.werkvorm, 'required', w.required, 'options', w.options) order by w.sort_order, w.werkvorm)
                            from public.videoleren_task_werkvormen w where w.task_id = t.id), '[]'::jsonb),
    'progress', coalesce((select jsonb_agg(jsonb_build_object('werkvorm', p.werkvorm, 'status', p.status, 'data', p.data, 'transcript_version', p.transcript_version, 'updated_at', p.updated_at))
                          from public.videoleren_progress p where p.task_id = t.id and p.student_id = v_id), '[]'::jsonb),
    'files', coalesce((select jsonb_agg(jsonb_build_object('id', f.id, 'werkvorm', f.werkvorm, 'kind', f.kind, 'storage_path', f.storage_path, 'created_at', f.created_at) order by f.created_at)
                       from public.videoleren_files f where f.task_id = t.id and f.student_id = v_id), '[]'::jsonb)
  );
end;
$$;

-- Save one werkvorm. Only while the task is open. Images/audio go to storage, not into data.
create or replace function public.videoleren_save_progress(
  p_hash text, p_task_id uuid, p_werkvorm text, p_data jsonb, p_status text default 'bezig')
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid := public.webwijzer_student_id(p_hash);
  t public.videoleren_tasks;
  v_row public.videoleren_progress;
begin
  if v_id is null then return jsonb_build_object('status', 'not_found'); end if;
  select * into t from public.videoleren_tasks where id = p_task_id;
  if not found or not public.videoleren_student_is_assigned(v_id, t.id) then
    return jsonb_build_object('status', 'not_found');
  end if;
  if not public.videoleren_task_is_open(t) then return jsonb_build_object('status', 'closed'); end if;
  if p_status not in ('bezig', 'klaar') then p_status := 'bezig'; end if;
  if pg_column_size(coalesce(p_data, '{}'::jsonb)) > 262144 then
    return jsonb_build_object('status', 'too_large');
  end if;
  if p_werkvorm <> 'kijken' and not exists (
       select 1 from public.videoleren_task_werkvormen w where w.task_id = t.id and w.werkvorm = p_werkvorm) then
    return jsonb_build_object('status', 'not_found');
  end if;

  insert into public.videoleren_progress as p (task_id, student_id, werkvorm, status, data, transcript_version, completed_at)
  values (t.id, v_id, p_werkvorm, p_status, coalesce(p_data, '{}'::jsonb), t.transcript_version,
          case when p_status = 'klaar' then now() end)
  on conflict (task_id, student_id, werkvorm) do update
    set data = excluded.data,
        status = excluded.status,
        transcript_version = excluded.transcript_version,
        updated_at = now(),
        completed_at = case when excluded.status = 'klaar' then coalesce(p.completed_at, now()) end
  returning * into v_row;

  return jsonb_build_object('status', 'ok', 'updated_at', v_row.updated_at);
end;
$$;

revoke all on function public.videoleren_student_tasks(text) from public;
revoke all on function public.videoleren_open_task(text, uuid, text) from public;
revoke all on function public.videoleren_save_progress(text, uuid, text, jsonb, text) from public;
grant execute on function public.videoleren_student_tasks(text) to anon, authenticated;
grant execute on function public.videoleren_open_task(text, uuid, text) to anon, authenticated;
grant execute on function public.videoleren_save_progress(text, uuid, text, jsonb, text) to anon, authenticated;

-- ---------------------------------------------------------------- storage
-- Private bucket; students upload through the videoleren-files edge function (signed URLs).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('videoleren-files', 'videoleren-files', false, 15728640,
        array['audio/mpeg', 'audio/wav', 'audio/webm', 'audio/mp4', 'image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

-- Teachers read files of their school's tasks. Path: <task_id>/<student_id>/<file>.
create policy "school members read videoleren storage" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'videoleren-files'
    and (storage.foldername(name))[1] in (
      select t.id::text from public.videoleren_tasks t where t.school_id in (select public.videoleren_my_school_ids()))
  );
