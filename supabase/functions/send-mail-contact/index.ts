import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const payload = await req.json();

    const name = payload.record?.name ?? payload.name ?? "";
    const email = payload.record?.email ?? payload.email ?? "";
    const type = payload.record?.type ?? payload.type ?? "";
    const subject = payload.record?.subject ?? payload.subject ?? "";
    const message = payload.record?.message ?? payload.message ?? "";
    const platform = payload.record?.platform ?? payload.platform ?? "bijleer.school";
    const school = payload.record?.school ?? payload.school ?? "";

    const resendKey = Deno.env.get("RESEND_API_KEY");
    if (!resendKey) throw new Error("RESEND_API_KEY not set");

    const htmlBody = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1d4ed8; border-bottom: 2px solid #e5e7eb; padding-bottom: 12px;">
          Nieuw contactbericht via ${platform}
        </h2>
        <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
          <tr><td style="padding: 8px 0; font-weight: 600; color: #374151; width: 140px;">Naam</td><td style="padding: 8px 0; color: #111827;">${name}</td></tr>
          <tr><td style="padding: 8px 0; font-weight: 600; color: #374151;">E-mail</td><td style="padding: 8px 0; color: #111827;"><a href="mailto:${email}" style="color: #2563eb;">${email}</a></td></tr>
          ${school ? `<tr><td style="padding: 8px 0; font-weight: 600; color: #374151;">School</td><td style="padding: 8px 0; color: #111827;">${school}</td></tr>` : ""}
          <tr><td style="padding: 8px 0; font-weight: 600; color: #374151;">Reden</td><td style="padding: 8px 0; color: #111827;">${type}</td></tr>
          <tr><td style="padding: 8px 0; font-weight: 600; color: #374151;">Platform</td><td style="padding: 8px 0; color: #111827;">${platform}</td></tr>
        </table>
        <div style="background: #f9fafb; border-left: 4px solid #2563eb; padding: 16px; border-radius: 0 8px 8px 0; margin: 16px 0;">
          <p style="font-weight: 600; color: #374151; margin: 0 0 8px 0;">Bericht:</p>
          <p style="color: #111827; margin: 0; white-space: pre-wrap;">${message}</p>
        </div>
        <p style="color: #9ca3af; font-size: 12px; margin-top: 24px;">
          Verzonden via het contactformulier op ${platform}
        </p>
      </div>
    `;

    const resendRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${resendKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "bijleer.school <noreply@bijleer.school>",
        to: ["info@bijleren.eu"],
        reply_to: email,
        subject: `[${platform}] ${subject || type} — ${name}`,
        html: htmlBody,
      }),
    });

    if (!resendRes.ok) {
      const errText = await resendRes.text();
      throw new Error(`Resend error: ${resendRes.status} ${errText}`);
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("send-mail-contact error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
