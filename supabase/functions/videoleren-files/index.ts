// Videoleren: student file uploads (MP3s, screenshots, drawings) into the private
// `videoleren-files` bucket.
//
// Students have no Supabase login, so they identify with their access_hash (the same key as
// the WebWijzer QR card). This function checks that the task is assigned to them and still
// open, then hands out a one-time signed upload URL. Files are stored as
// <task_id>/<student_id>/<uuid>.<ext> and registered in public.videoleren_files.
//
// POST body:
//   { action: "upload", hash, task_id, werkvorm, kind: "audio"|"image"|"sketch", mime, size }
//   { action: "url",    hash, task_id, file_id }   -> signed download URL (1 hour)
//   { action: "delete", hash, task_id, file_id }
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

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

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 200, headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  try {
    const body = await req.json();
    const { action, hash, task_id } = body ?? {};
    if (typeof hash !== "string" || !hash || typeof task_id !== "string" || !task_id) {
      return json({ error: "bad_request" }, 400);
    }

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
      auth: { persistSession: false },
    });

    // Same checks as the student page: valid hash, task assigned to this student and still open.
    const { data: opened, error: openErr } = await admin.rpc("videoleren_open_task", {
      p_hash: hash,
      p_task_id: task_id,
    });
    if (openErr) throw openErr;
    if (opened?.status !== "ok") return json({ error: opened?.status ?? "not_found" }, 403);
    const studentId: string = opened.student.id;

    if (action === "upload") {
      const { werkvorm, kind, mime, size } = body;
      const ext = MIME_EXT[mime];
      if (!ext || !["audio", "image", "sketch"].includes(kind) || typeof werkvorm !== "string" || werkvorm.length > 10) {
        return json({ error: "bad_request" }, 400);
      }
      if (typeof size === "number" && size > MAX_BYTES) return json({ error: "too_large" }, 413);

      const path = `${task_id}/${studentId}/${crypto.randomUUID()}.${ext}`;
      const { data: signed, error: signErr } = await admin.storage.from(BUCKET).createSignedUploadUrl(path);
      if (signErr) throw signErr;

      const { data: file, error: insErr } = await admin
        .from("videoleren_files")
        .insert({ task_id, student_id: studentId, werkvorm, kind, storage_path: path, mime_type: mime, size_bytes: size ?? null })
        .select("id")
        .single();
      if (insErr) throw insErr;

      return json({ file_id: file.id, path, token: signed.token, signed_url: signed.signedUrl });
    }

    if (action === "url" || action === "delete") {
      const { file_id } = body;
      const { data: file, error: fErr } = await admin
        .from("videoleren_files")
        .select("id, storage_path")
        .eq("id", file_id)
        .eq("task_id", task_id)
        .eq("student_id", studentId)
        .maybeSingle();
      if (fErr) throw fErr;
      if (!file) return json({ error: "not_found" }, 404);

      if (action === "url") {
        const { data, error } = await admin.storage.from(BUCKET).createSignedUrl(file.storage_path, 3600);
        if (error) throw error;
        return json({ url: data.signedUrl });
      }
      await admin.storage.from(BUCKET).remove([file.storage_path]);
      await admin.from("videoleren_files").delete().eq("id", file.id);
      return json({ ok: true });
    }

    return json({ error: "bad_request" }, 400);
  } catch (err) {
    console.error("videoleren-files error", err);
    return json({ error: "server_error" }, 500);
  }
});
