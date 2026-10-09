-- The videoleren-files edge function (service role) reuses the same student checks.
grant execute on function public.videoleren_open_task(text, uuid, text) to service_role;
