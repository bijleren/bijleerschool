-- School storage counts consumption: every uploaded file (and every new version) adds to
-- schools.storage_used_bytes, and deleting or replacing a file never lowers it.
--
-- storage_usage_log is the single source. deleted_at is still filled in when a file is
-- removed (as a record), but it no longer affects the total.
--
-- Before this, update_school_storage() (BlinkQR) overwrote storage_used_bytes with only the
-- current size of the school's QR files, wiping everything counted from storage_usage_log.
-- It now recalculates the same single total, and BlinkQR files are logged on upload.

create or replace function public.update_school_storage_usage(p_school_id uuid)
returns void language plpgsql set search_path = '' as $$
begin
  update public.schools
     set storage_used_bytes = (
       select coalesce(sum(l.file_size_bytes), 0)
       from public.storage_usage_log l
       where l.school_id = p_school_id)
   where id = p_school_id;
end; $$;

-- BlinkQR keeps calling this one; it now gives the same total instead of overwriting it.
create or replace function public.update_school_storage(school_id_param uuid)
returns void language plpgsql set search_path = '' as $$
begin
  perform public.update_school_storage_usage(school_id_param);
end; $$;

-- Breakdown per type, also as consumption.
create or replace function public.get_storage_breakdown(p_school_id uuid)
returns table(file_type text, total_size_bytes bigint, file_count bigint)
language plpgsql set search_path = '' as $$
begin
  return query
  select sul.file_type, sum(sul.file_size_bytes)::bigint, count(*)::bigint
  from public.storage_usage_log sul
  where sul.school_id = p_school_id
  group by sul.file_type
  order by 2 desc;
end; $$;

-- BlinkQR: log every uploaded file (photo, video, audio, document) of a school QR code,
-- also when an item gets a new file.
create or replace function public.log_qr_content_storage()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_school uuid;
  v_owner uuid;
  v_size bigint;
begin
  if new.content_type not in ('photo', 'video', 'audio', 'document') then return new; end if;
  v_size := coalesce(nullif(new.content->>'size', '')::bigint, 0);
  if v_size <= 0 then return new; end if;
  if tg_op = 'UPDATE' and (old.content->>'url') is not distinct from (new.content->>'url') then return new; end if;
  select q.school_id, q.user_id into v_school, v_owner from public.qr_codes q where q.id = new.qr_code_id;
  if v_school is null then return new; end if;
  insert into public.storage_usage_log (school_id, file_type, file_path, file_size_bytes, uploaded_by)
  values (v_school, 'blinkqr', coalesce(new.content->>'url', 'qr_content_items/' || new.id), v_size, v_owner);
  perform public.update_school_storage_usage(v_school);
  return new;
exception when others then
  -- Counting must never block a BlinkQR upload.
  return new;
end; $$;
revoke all on function public.log_qr_content_storage() from public, anon, authenticated;

drop trigger if exists log_qr_content_storage on public.qr_content_items;
create trigger log_qr_content_storage
  after insert or update of content on public.qr_content_items
  for each row execute function public.log_qr_content_storage();

-- Recalculate every school that has logged uploads.
do $$
declare r record;
begin
  for r in select distinct school_id from public.storage_usage_log loop
    perform public.update_school_storage_usage(r.school_id);
  end loop;
end $$;
