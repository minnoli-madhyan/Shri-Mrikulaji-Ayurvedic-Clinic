// supabase/functions/send-whatsapp/index.ts
import { serve }        from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const WHATSAPP_TOKEN  = Deno.env.get("WHATSAPP_TOKEN")!;
const PHONE_NUMBER_ID = Deno.env.get("WHATSAPP_PHONE_NUMBER_ID")!;
const BASE_URL        = `https://graph.facebook.com/v19.0/${PHONE_NUMBER_ID}/messages`;

const SUPABASE_URL      = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SUPABASE_SERVICE  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ADMIN_PHONE       = Deno.env.get("ADMIN_WHATSAPP")!;          // e.g. 919876543210
const ALLOWED_ORIGINS   = (Deno.env.get("ALLOWED_ORIGINS") ?? "https://shrimac.com,https://www.shrimac.com,http://localhost:5173")
  .split(",").map((o) => o.trim());

// Who may trigger which message.
//   public — anyone (guest booking / checkout); recipient is forced to ADMIN_PHONE
//   user   — any signed-in user
//   staff  — signed-in admin or doctor only
const POLICY: Record<string, "public" | "user" | "staff"> = {
  admin_appt_alert:         "public",
  admin_order_alert:        "user",
  order_confirmation:       "user",
  appointment_confirmation: "staff",
  appointment_reminder:     "staff",
  order_tracking:           "staff",
};
const ADMIN_ONLY_RECIPIENT = new Set(["admin_appt_alert", "admin_order_alert"]);

// Best-effort per-IP rate limit (in-memory; resets when the function cold-starts).
const hits = new Map<string, number[]>();
function rateLimited(key: string, max = 10, windowMs = 60_000): boolean {
  const now  = Date.now();
  const list = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
  list.push(now);
  hits.set(key, list);
  return list.length > max;
}

function corsFor(req: Request) {
  const origin = req.headers.get("origin") ?? "";
  return {
    "Access-Control-Allow-Origin":  ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0],
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Vary": "Origin",
  };
}
let corsHeaders: Record<string, string> = corsFor(new Request("https://x"));

// ── Structured error helper ───────────────────────────────────────────────────
function errorResponse(code: string, message: string, status: number) {
  console.error(`[send-whatsapp] ${code}: ${message}`);
  return new Response(
    JSON.stringify({ error: { code, message } }),
    { status, headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
}

// ── Build WhatsApp API body per template ──────────────────────────────────────
function buildBody(
  type: string,
  to:   string,
  data: Record<string, string>,
): { body: object } | { validationError: string } {

  const text = (val: string | undefined, fallback = "") =>
    ({ type: "text", text: (val ?? fallback).trim() || fallback });

  switch (type) {

    case "appointment_confirmation":
      // smac_ap_confirm — triggered when admin/doctor sets status → "confirmed"
      if (!data.patientName || !data.doctorName || !data.date || !data.time) {
        return { validationError: "appointment_confirmation requires patientName, doctorName, date, time" };
      }
      return {
        body: {
          messaging_product: "whatsapp", to, type: "template",
          template: {
            name:     "smac_ap_confirm",
            language: { code: "en" },
            components: [{
              type: "body",
              parameters: [
                text(data.patientName),
                text(data.doctorName),
                text(data.date),
                text(data.time),
                text(data.consultType, "Physical"),
              ],
            }],
          },
        },
      };

    case "appointment_reminder":
      // smac_ap_reminder — triggered 24 hours before appointment by the cron function
      if (!data.patientName || !data.doctorName || !data.time) {
        return { validationError: "appointment_reminder requires patientName, doctorName, time" };
      }
      return {
        body: {
          messaging_product: "whatsapp", to, type: "template",
          template: {
            name:     "smac_ap_reminder",
            language: { code: "en" },
            components: [{
              type: "body",
              parameters: [
                text(data.patientName),  // {{1}}
                text(data.doctorName),   // {{2}}
                text(data.date),         // {{3}} ← added
                text(data.time),         // {{4}}
              ],
            }],
          },
        },
      };

    case "order_confirmation":
      if (!data.patientName || !data.orderId || !data.total) {
        return { validationError: "order_confirmation requires patientName, orderId, total" };
      }
      return {
        body: {
          messaging_product: "whatsapp", to, type: "template",
          template: {
            name:     "smac_order_confirm",
            language: { code: "en" },
            components: [{
              type: "body",
              parameters: [
                text(data.patientName),
                text(data.orderId),
                text(data.total),
              ],
            }],
          },
        },
      };

    case "order_tracking":
      if (!data.orderId || !data.status) {
        return { validationError: "order_tracking requires orderId, status" };
      }
      return {
        body: {
          messaging_product: "whatsapp", to, type: "template",
          template: {
            name:     "smac_order_update",
            language: { code: "en" },
            components: [{
              type: "body",
              parameters: [
                text(data.orderId),
                text(data.status),
              ],
            }],
          },
        },
      };

    case "admin_order_alert":
      if (!data.customerName || !data.phone || !data.orderId || !data.items || !data.total) {
        return { validationError: "admin_order_alert requires customerName, phone, orderId, items, total" };
      }
      return {
        body: {
          messaging_product: "whatsapp", to, type: "template",
          template: {
            name:     "smac_admin_order_alert",
            language: { code: "en" },
            components: [{
              type: "body",
              parameters: [
                text(data.customerName),
                text(data.phone),
                text(data.orderId),
                text(data.items),
                text(data.total),
              ],
            }],
          },
        },
      };

    case "admin_appt_alert":
      if (!data.patientName || !data.phone || !data.doctorName || !data.dateTime) {
        return { validationError: "admin_appt_alert requires patientName, phone, doctorName, dateTime" };
      }
      return {
        body: {
          messaging_product: "whatsapp", to, type: "template",
          template: {
            name:     "smac_admin_appt_alert",
            language: { code: "en" },
            components: [{
              type: "body",
              parameters: [
                text(data.patientName),
                text(data.phone),
                text(data.doctorName),
                text(data.dateTime),
              ],
            }],
          },
        },
      };

    default:
      return { validationError: `Unknown message type: "${type}"` };
  }
}

// ── Request handler ───────────────────────────────────────────────────────────
serve(async (req) => {
  corsHeaders = corsFor(req);
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return errorResponse("METHOD_NOT_ALLOWED", "Use POST", 405);
  }

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (rateLimited(ip)) {
    return errorResponse("RATE_LIMITED", "Too many requests", 429);
  }

  // ── Parse body ────────────────────────────────────────────────────────────
  let type: string, to: string, data: Record<string, string>;
  try {
    ({ type, to, data = {} } = await req.json());
  } catch {
    return errorResponse("INVALID_JSON", "Request body is not valid JSON", 400);
  }

  // ── Required field validation ────────────────────────────────────────────
  if (!type || typeof type !== "string") {
    return errorResponse("MISSING_FIELD", "Field 'type' is required", 400);
  }
  if (!ADMIN_ONLY_RECIPIENT.has(type) && (!to || typeof to !== "string" || !/^\d{10,15}$/.test(to))) {
    return errorResponse(
      "INVALID_PHONE",
      `Field 'to' must be a numeric phone number (10-15 digits). Got: "${to}"`,
      400,
    );
  }

  // ── Authorisation ─────────────────────────────────────────────────────────
  const level = POLICY[type];
  if (!level) {
    return errorResponse("VALIDATION_ERROR", `Unknown message type: "${type}"`, 400);
  }

  if (level !== "public") {
    const jwt = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${jwt}` } },
    });
    const { data: { user } } = await userClient.auth.getUser(jwt);
    if (!user) {
      return errorResponse("UNAUTHORIZED", "Sign in to use this endpoint", 401);
    }
    if (level === "staff") {
      const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE);
      const { data: prof } = await admin.from("profiles").select("role").eq("id", user.id).single();
      if (!prof || !["admin", "doctor"].includes(prof.role)) {
        return errorResponse("FORBIDDEN", "Staff only", 403);
      }
    }
    if (rateLimited(`user:${user.id}`, 30)) {
      return errorResponse("RATE_LIMITED", "Too many requests", 429);
    }
  }

  // Admin alerts always go to the clinic's own number, never a client-supplied one.
  if (ADMIN_ONLY_RECIPIENT.has(type)) to = ADMIN_PHONE;

  // ── Build template body ───────────────────────────────────────────────────
  const result = buildBody(type, to, data);
  if ("validationError" in result) {
    return errorResponse("VALIDATION_ERROR", result.validationError, 400);
  }

  // ── Call WhatsApp Cloud API ───────────────────────────────────────────────
  let apiRes: Response;
  try {
    apiRes = await fetch(BASE_URL, {
      method:  "POST",
      headers: {
        "Authorization": `Bearer ${WHATSAPP_TOKEN}`,
        "Content-Type":  "application/json",
      },
      body: JSON.stringify(result.body),
    });
  } catch (networkErr: any) {
    return errorResponse("NETWORK_ERROR", `Could not reach WhatsApp API: ${networkErr.message}`, 502);
  }

  let apiResult: Record<string, unknown>;
  try {
    apiResult = await apiRes.json();
  } catch {
    return errorResponse("PARSE_ERROR", "WhatsApp API returned non-JSON response", 502);
  }

  // ── Log and return ────────────────────────────────────────────────────────
  if (!apiRes.ok) {
    // Surface the Meta error code so callers can act on it (e.g. 131026 = number not on WA)
    const metaCode    = (apiResult as any)?.error?.code      ?? "unknown";
    const metaMessage = (apiResult as any)?.error?.message   ?? JSON.stringify(apiResult);
    console.error(
      `[send-whatsapp] FAILED type=${type} to=${to} metaCode=${metaCode}: ${metaMessage}`
    );
    return new Response(JSON.stringify(apiResult), {
      status:  apiRes.status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const msgId = (apiResult as any)?.messages?.[0]?.id ?? "—";
  console.log(`[send-whatsapp] OK type=${type} to=${to} msgId=${msgId}`);

  return new Response(JSON.stringify(apiResult), {
    status:  200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
