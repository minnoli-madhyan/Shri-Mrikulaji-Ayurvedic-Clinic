// supabase/functions/appointment-reminders/index.ts
//
// Triggered every hour by pg_cron.
// Sends smac_ap_reminder to confirmed appointments that are ~2 hours away (±30 min window).

import { serve }        from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL         = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const WHATSAPP_TOKEN       = Deno.env.get("WHATSAPP_TOKEN")!;
const PHONE_NUMBER_ID      = Deno.env.get("WHATSAPP_PHONE_NUMBER_ID")!;
const WA_API_URL           = `https://graph.facebook.com/v19.0/${PHONE_NUMBER_ID}/messages`;

const corsHeaders = {
  "Access-Control-Allow-Origin":  "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function normalizePhone(phone: string): string {
  let p = String(phone).replace(/[\s\-+]/g, "");
  if (p.startsWith("0")) p = p.slice(1);
  if (!p.startsWith("91")) p = "91" + p;
  return p;
}

function getTargetWindow() {
  const HOURS_BEFORE  = 24;
  const WINDOW_MINS   = 30;
  const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

  const targetISTms   = Date.now() + IST_OFFSET_MS + HOURS_BEFORE * 60 * 60 * 1000;
  const targetISTDate = new Date(targetISTms);

  const y = targetISTDate.getUTCFullYear();
  const m = String(targetISTDate.getUTCMonth() + 1).padStart(2, "0");
  const d = String(targetISTDate.getUTCDate()).padStart(2, "0");
  const targetDate = `${y}-${m}-${d}`;

  const targetTotalMins = targetISTDate.getUTCHours() * 60 + targetISTDate.getUTCMinutes();
  const windowStartMins = targetTotalMins - WINDOW_MINS;
  const windowEndMins   = targetTotalMins + WINDOW_MINS;

  return { targetDate, windowStartMins, windowEndMins };
}

function parseTimeSlot(slot: string): number {
  const match = slot.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!match) return -1;

  let hours    = parseInt(match[1]);
  const mins   = parseInt(match[2]);
  const period = match[3].toUpperCase();

  if (period === "AM" && hours === 12) hours = 0;
  if (period === "PM" && hours !== 12) hours += 12;

  return hours * 60 + mins;
}

async function sendReminder(appt: {
  id:            string;
  patient_phone: string;
  patient_name:  string;
  doctor_name:   string;
  time_slot:     string;
  date:          string;
}): Promise<{ ok: boolean; error?: string }> {

  const to = normalizePhone(appt.patient_phone);

  const body = {
    messaging_product: "whatsapp",
    to,
    type: "template",
    template: {
      name:     "smac_ap_reminder",
      language: { code: "en" },
      components: [{
        type: "body",
        parameters: [
          { type: "text", text: appt.patient_name || "Patient" },
          { type: "text", text: appt.doctor_name  || "Doctor"  },
          { type: "text", text: appt.date         || ""        },
          { type: "text", text: appt.time_slot    || ""        },
        ],
      }],
    },
  };

  try {
    const res = await fetch(WA_API_URL, {
      method:  "POST",
      headers: {
        "Authorization": `Bearer ${WHATSAPP_TOKEN}`,
        "Content-Type":  "application/json",
      },
      body: JSON.stringify(body),
    });

    const result = await res.json();

    if (!res.ok) {
      const errMsg = result?.error?.message ?? JSON.stringify(result);
      console.error(`[appointment-reminders] FAILED appt=${appt.id} to=${to}: ${errMsg}`);
      return { ok: false, error: errMsg };
    }

    const msgId = result?.messages?.[0]?.id ?? "—";
    console.log(`[appointment-reminders] OK appt=${appt.id} to=${to} msgId=${msgId}`);
    return { ok: true };

  } catch (err: any) {
    console.error(`[appointment-reminders] Network error appt=${appt.id}: ${err.message}`);
    return { ok: false, error: err.message };
  }
}

// ── Main handler ──────────────────────────────────────────────────────────────
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  const { targetDate, windowStartMins, windowEndMins } = getTargetWindow();

  console.log(
    `[appointment-reminders] Checking date=${targetDate} window ${windowStartMins}–${windowEndMins} mins since midnight (IST)`
  );

  const { data: appointments, error: fetchError } = await supabase
    .from("appointments")
    .select("id, patient_phone, patient_name, doctor_name, time_slot, date")
    .eq("status",        "confirmed")
    .eq("reminder_sent", false)
    .eq("date",          targetDate);

  if (fetchError) {
    console.error("[appointment-reminders] DB fetch error:", fetchError.message);
    return new Response(
      JSON.stringify({ error: fetchError.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const inWindow = (appointments ?? []).filter(appt => {
    const slotMins = parseTimeSlot(appt.time_slot ?? "");
    if (slotMins === -1) {
      console.warn(`[appointment-reminders] appt=${appt.id} unrecognized time_slot="${appt.time_slot}" — skipping`);
      return false;
    }
    return slotMins >= windowStartMins && slotMins <= windowEndMins;
  });

  if (inWindow.length === 0) {
    console.log(`[appointment-reminders] No appointments in window — nothing to send`);
    return new Response(
      JSON.stringify({ sent: 0, skipped: 0, failed: 0 }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  console.log(`[appointment-reminders] Found ${inWindow.length} appointment(s) in window`);

  let sent = 0, failed = 0, skipped = 0;

  for (const appt of inWindow) {
    if (!appt.patient_phone) {
      console.warn(`[appointment-reminders] appt=${appt.id} has no phone — skipping`);
      skipped++;
      continue;
    }

    const { ok } = await sendReminder(appt);

    if (ok) {
      const { error: updateError } = await supabase
        .from("appointments")
        .update({
          reminder_sent:    true,
          reminder_sent_at: new Date().toISOString(),
        })
        .eq("id", appt.id);

      if (updateError) {
        console.warn(`[appointment-reminders] Could not mark reminder_sent for appt=${appt.id}: ${updateError.message}`);
      }
      sent++;
    } else {
      failed++;
    }
  }

  const summary = { sent, failed, skipped, total: inWindow.length, targetDate };
  console.log("[appointment-reminders] Done:", JSON.stringify(summary));

  return new Response(
    JSON.stringify(summary),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});