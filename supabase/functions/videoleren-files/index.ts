// Videoleren: student file uploads (MP3s, screenshots, drawings) into the private
// `videoleren-files` bucket, counted toward the school's storage like every other upload.
//
// Students have no Supabase login, so they identify with their access_hash (the same key as
// the WebWijzer QR card). This function checks that the task is assigned to them and still
// open, then hands out a one-time signed upload URL. Files are stored as
// <task_id>/<student_id>/<uuid>.<ext> and registered in public.videoleren_files.
//
// Storage counting: after the browser uploaded the file it calls "confirm"; we read the real
// size from storage, log it in storage_usage_log (file_type 'videoleren') and recalculate
// schools.storage_used_bytes. Deleting a file marks its log row as deleted.
//
// POST body (students):
//   { action: "upload",  hash, task_id, werkvorm, kind: "audio"|"image"|"sketch", mime, size }
//   { action: "confirm", hash, task_id, file_id }
//   { action: "url",     hash, task_id, file_id }   -> signed download URL (1 hour)
//   { action: "delete",  hash, task_id, file_id }
// POST body (teachers, with their own login):
//   { action: "delete_task", task_id }  -> removes the task and its files. The storage they
//     used keeps counting for the school (deleting a task does not give the megabytes back).
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient, SupabaseClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const BUCKET = "videoleren-files";
const MAX_BYTES = 15 * 1024 * 1024;
const MIME_EXT: Record<string, string> = {
  "audio/mpeg": "mp3",
  "audio/wav": "wav",
  "audio/webm": "webm",
  "audio/mp4": "m4a",
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const logPath = (path: string) => `${BUCKET}/${path}`;

async function forgetFiles(admin: SupabaseClient, schoolId: string, paths: string[]) {
  if (!paths.length) return;
  await admin.storage.from(BUCKET).remove(paths);
  await admin
    .from("storage_usage_log")
    .update({ deleted_at: new Date().toISOString() })
    .eq("school_id", schoolId)
    .in("file_path", paths.map(logPath))
    .is("deleted_at", null);
  await admin.rpc("update_school_storage_usage", { p_school_id: schoolId });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 200, headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  try {
    const body = await req.json();
    const { action, hash, task_id } = body ?? {};
    if (typeof task_id !== "string" || !task_id) return json({ error: "bad_request" }, 400);

    const url = Deno.env.get("SUPABASE_URL")!;
    const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });

    // ---------------------------------------------------------------- teacher: delete a task
    if (action === "delete_task") {
      const user = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, {
        auth: { persistSession: false },
        global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
      });
      // RLS decides: only members of the task's school get the row back.
      const { data: task } = await user.from("videoleren_tasks").select("id, school_id").eq("id", task_id).maybeSingle();
      if (!task) return json({ error: "not_found" }, 404);
      const { data: files } = await admin.from("videoleren_files").select("storage_path").eq("task_id", task_id);
      const paths = (files ?? []).map((f) => f.storage_path);
      // Remove the files only; storage_usage_log stays as it is, so the school's usage does not drop.
      if (paths.length) await admin.storage.from(BUCKET).remove(paths);
      const { error } = await admin.from("videoleren_tasks").delete().eq("id", task_id);
      if (error) throw error;
      return json({ ok: true });
    }

    // ---------------------------------------------------------------- students
    if (typeof hash !== "string" || !hash) return json({ error: "bad_request" }, 400);

    // Same checks as the student page: valid hash, task assigned to this student and still open.
    const { data: opened, error: openErr } = await admin.rpc("videoleren_open_task", { p_hash: hash, p_task_id: task_id });
    if (openErr) throw openErr;
    if (opened?.status !== "ok") return json({ error: opened?.status ?? "not_found" }, 403);
    const studentId: string = opened.student.id;

    const { data: task, error: taskErr } = await admin
      .from("videoleren_tasks")
      .select("school_id, schools(storage_used_bytes, storage_limit_bytes)")
      .eq("id", task_id)
      .single();
    if (taskErr) throw taskErr;
    const schoolId: string = task.school_id;

    if (action === "upload") {
      const { werkvorm, kind, mime, size } = body;
      const ext = MIME_EXT[mime];
      if (!ext || !["audio", "image", "sketch"].includes(kind) || typeof werkvorm !== "string" || werkvorm.length > 10) {
        return json({ error: "bad_request" }, 400);
      }
      if (typeof size === "number" && size > MAX_BYTES) return json({ error: "too_large" }, 413);

      // Refuse when the school's storage is full.
      const school = Array.isArray(task.schools) ? task.schools[0] : task.schools;
      const used = Number(school?.storage_used_bytes ?? 0);
      const limit = Number(school?.storage_limit_bytes ?? 0);
      if (limit > 0 && used + (typeof size === "number" ? size : 0) > limit) return json({ error: "quota" }, 413);

      const path = `${task_id}/${studentId}/${crypto.randomUUID()}.${ext}`;
      const { data: signed, error: signErr } = await admin.storage.from(BUCKET).createSignedUploadUrl(path);
      if (signErr) throw signErr;

      const { data: file, error: insErr } = await admin
        .from("videoleren_files")
        .insert({ task_id, student_id: studentId, werkvorm, kind, storage_path: path, mime_type: mime, size_bytes: null })
        .select("id")
        .single();
      if (insErr) throw insErr;

      return json({ file_id: file.id, path, token: signed.token, signed_url: signed.signedUrl });
    }

    const { file_id } = body;
    const { data: file, error: fErr } = await admin
      .from("videoleren_files")
      .select("id, storage_path, size_bytes")
      .eq("id", file_id)
      .eq("task_id", task_id)
      .eq("student_id", studentId)
      .maybeSingle();
    if (fErr) throw fErr;
    if (!file) return json({ error: "not_found" }, 404);

    if (action === "confirm") {
      if (file.size_bytes != null) return json({ ok: true, size: file.size_bytes });
      // Real size from storage, not what the browser claimed.
      const folder = file.storage_path.slice(0, file.storage_path.lastIndexOf("/"));
      const name = file.storage_path.slice(file.storage_path.lastIndexOf("/") + 1);
      const { data: listed } = await admin.storage.from(BUCKET).list(folder, { search: name, limit: 1 });
      const obj = (listed ?? []).find((o) => o.name === name);
      if (!obj) {
        await admin.from("videoleren_files").delete().eq("id", file.id);
        return json({ error: "not_uploaded" }, 404);
      }
      const size = Number((obj.metadata as { size?: number } | null)?.size ?? 0);
      await admin.from("videoleren_files").update({ size_bytes: size }).eq("id", file.id);
      await admin.from("storage_usage_log").insert({
        school_id: schoolId,
        file_type: "videoleren",
        file_path: logPath(file.storage_path),
        file_size_bytes: size,
        uploaded_by: null,
      });
      await admin.rpc("update_school_storage_usage", { p_school_id: schoolId });
      return json({ ok: true, size });
    }

    if (action === "url") {
      const { data, error } = await admin.storage.from(BUCKET).createSignedUrl(file.storage_path, 3600);
      if (error) throw error;
      return json({ url: data.signedUrl });
    }

    if (action === "delete") {
      await forgetFiles(admin, schoolId, [file.storage_path]);
      await admin.from("videoleren_files").delete().eq("id", file.id);
      return json({ ok: true });
    }

    return json({ error: "bad_request" }, 400);
  } catch (err) {
    console.error("videoleren-files error", err);
    return json({ error: "server_error" }, 500);
  }
});
