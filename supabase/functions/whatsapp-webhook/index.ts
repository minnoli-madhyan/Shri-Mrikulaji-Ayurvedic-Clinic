// supabase/functions/whatsapp-webhook/index.ts
//
// Two responsibilities:
//   GET  — Meta webhook verification (returns hub.challenge)
//   POST — Handles delivery/read/failed status updates + incoming patient replies
//
// IMPORTANT: Always return HTTP 200 to Meta on POST, even on internal errors.
// If we return any non-200, Meta will retry the event repeatedly.

import { serve }        from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const VERIFY_TOKEN         = Deno.env.get("WHATSAPP_WEBHOOK_VERIFY_TOKEN")!;
const SUPABASE_URL         = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// Lazy-init so GET verification path doesn't need DB
let _supabase: ReturnType<typeof createClient> | null = null;
const db = () => {
  if (!_supabase) _supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
  return _supabase;
};

// ── Delivery status persistence ───────────────────────────────────────────────
//
// Requires this table (run once as a migration):
//
//   CREATE TABLE IF NOT EXISTS whatsapp_message_log (
//     message_id  TEXT        PRIMARY KEY,
//     status      TEXT        NOT NULL,           -- sent | delivered | read | failed
//     updated_at  TIMESTAMPTZ NOT NULL,
//     errors      JSONB,
//     recipient   TEXT
//   );
//
async function persistStatus(s: {
  id:        string;
  status:    string;
  timestamp: string;
  errors?:   unknown[];
  recipient_id?: string;
}) {
  const { error } = await db()
    .from("whatsapp_message_log")
    .upsert(
      {
        message_id: s.id,
        status:     s.status,
        updated_at: new Date(Number(s.timestamp) * 1000).toISOString(),
        errors:     s.errors?.length ? s.errors : null,
        recipient:  s.recipient_id ?? null,
      },
      { onConflict: "message_id" },
    );

  if (error) {
    // Non-fatal — log and continue; don't fail the webhook
    console.warn(`[whatsapp-webhook] DB upsert failed for msg=${s.id}: ${error.message}`);
  }
}

// ── Main handler ──────────────────────────────────────────────────────────────
serve(async (req) => {

  // ── GET: Meta webhook verification ───────────────────────────────────────
  if (req.method === "GET") {
    const url       = new URL(req.url);
    const mode      = url.searchParams.get("hub.mode");
    const token     = url.searchParams.get("hub.verify_token");
    const challenge = url.searchParams.get("hub.challenge");

    if (mode === "subscribe" && token === VERIFY_TOKEN) {
      console.log("[whatsapp-webhook] Verification successful");
      return new Response(challenge, { status: 200 });
    }

    console.warn("[whatsapp-webhook] Verification failed — token mismatch");
    return new Response("Forbidden", { status: 403 });
  }

  // ── POST: incoming events from Meta ──────────────────────────────────────
  if (req.method === "POST") {

    // Parse body — always return 200 even on parse failure
    let payload: any;
    try {
      payload = await req.json();
    } catch {
      console.error("[whatsapp-webhook] Failed to parse JSON payload");
      return new Response("OK", { status: 200 });
    }

    try {
      const changes = payload?.entry?.[0]?.changes?.[0]?.value;
      if (!changes) {
        // Possibly a test ping from Meta with no changes
        return new Response("OK", { status: 200 });
      }

      // ── Delivery / read / failed status updates ────────────────────────
      if (changes.statuses?.length) {
        for (const s of changes.statuses) {
          const level = s.status === "failed" ? "error" : "log";
          console[level](
            `[whatsapp-webhook] msg=${s.id} status=${s.status} ts=${s.timestamp}`,
            s.status === "failed" ? JSON.stringify(s.errors ?? []) : "",
          );

          // Persist to DB (fire-and-don't-wait so we always hit 200 fast)
          persistStatus(s).catch(() => {/* already logged inside persistStatus */});
        }
      }

      // ── Incoming replies from patients ────────────────────────────────
      if (changes.messages?.length) {
        for (const msg of changes.messages) {
          const body = msg.text?.body?.trim() ?? "";
          console.log(`[whatsapp-webhook] reply from=${msg.from} type=${msg.type} body="${body}"`);

          // ── Keyword actions ──────────────────────────────────────────
          //  Extend this block to handle patient self-service keywords.
          //  Current example: "CANCEL" cancels the most recent confirmed appointment.
          if (body.toUpperCase() === "CANCEL") {
            // Look up patient by phone and cancel their next appointment
            const phone = msg.from;   // already 91XXXXXXXXXX format from Meta

            const { data: appts } = await db()
              .from("appointments")
              .select("id")
              .eq("patient_phone", phone.replace(/^91/, ""))   // stored without 91 prefix
              .eq("status", "confirmed")
              .order("date", { ascending: true })
              .limit(1);

            if (appts?.length) {
              const { error: cancelErr } = await db()
                .from("appointments")
                .update({ status: "cancelled" })
                .eq("id", appts[0].id);

              if (cancelErr) {
                console.error(`[whatsapp-webhook] Cancel failed for phone=${phone}: ${cancelErr.message}`);
              } else {
                console.log(`[whatsapp-webhook] Auto-cancelled appt=${appts[0].id} via CANCEL keyword`);
              }
            }
          }
          // Add more keyword handlers here (e.g. "CONFIRM", "RESCHEDULE")
        }
      }

    } catch (err: any) {
      // Log but still return 200 — never let Meta spam retries
      console.error("[whatsapp-webhook] Processing error:", err.message);
    }

    return new Response("OK", { status: 200 });
  }

  return new Response("Method not allowed", { status: 405 });
});
