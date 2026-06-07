// src/lib/whatsapp.js
// Calls the edge function directly via fetch — identical to how Thunder Client tests it.
// This bypasses supabase.functions.invoke so JWT/RLS issues can never block the WA send.

const SUPABASE_URL      = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
const ADMIN_PHONE       = import.meta.env.VITE_ADMIN_WHATSAPP; // e.g. 919876543210

// Normalize phone: strip +, spaces, dashes → ensure 91XXXXXXXXXX
const normalizePhone = (phone) => {
  let p = String(phone).replace(/[\s\-+]/g, '');
  if (p.startsWith('0')) p = p.slice(1);
  if (!p.startsWith('91')) p = '91' + p;
  return p;
};

export const sendWhatsApp = async (type, phone, data) => {
  try {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/send-whatsapp`, {
      method: 'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({ type, to: normalizePhone(phone), data }),
    });

    const result = await res.json();

    if (!res.ok) {
      console.error(`[WhatsApp] FAILED type=${type} to=${normalizePhone(phone)}`, result);
      return { result: null, error: result };
    }

    console.log(`[WhatsApp] OK type=${type} to=${normalizePhone(phone)}`, result);
    return { result, error: null };

  } catch (err) {
    console.error(`[WhatsApp] Network error type=${type}`, err.message);
    return { result: null, error: err };
  }
};

// ── Convenience wrappers ──────────────────────────────────────

export const sendOTP = (phone, otp) =>
  sendWhatsApp('otp', phone, { otp });

export const sendAppointmentConfirmation = (phone, { patientName, doctorName, date, time, consultType }) =>
  sendWhatsApp('appointment_confirmation', phone, {
    patientName:  patientName  || 'Patient',
    doctorName:   doctorName   || 'Doctor',
    date:         date         || '',
    time:         time         || '',
    consultType:  consultType  || 'Physical',
  });

// export const sendAppointmentReminder = (phone, { patientName, doctorName, time }) =>
//   sendWhatsApp('appointment_reminder', phone, { patientName, doctorName, time });

export const sendOrderConfirmation = (phone, { patientName, orderId, total }) =>
  sendWhatsApp('order_confirmation', phone, { patientName, orderId, total });

export const sendOrderTracking = (phone, { orderId, status }) =>
  sendWhatsApp('order_tracking', phone, { orderId, status });

// ── Admin alert helpers (always sent to ADMIN_PHONE) ──────────
export const sendAdminOrderAlert = ({ customerName, phone, orderId, items, total }) => {
  if (!ADMIN_PHONE) { console.warn('[WhatsApp] VITE_ADMIN_WHATSAPP not set — skipping admin order alert'); return; }
  return sendWhatsApp('admin_order_alert', ADMIN_PHONE, { customerName, phone, orderId, items, total });
};

export const sendAdminApptAlert = ({ patientName, phone, doctorName, dateTime }) => {
  if (!ADMIN_PHONE) { console.warn('[WhatsApp] VITE_ADMIN_WHATSAPP not set — skipping admin appt alert'); return; }
  return sendWhatsApp('admin_appt_alert', ADMIN_PHONE, { patientName, phone, doctorName, dateTime });
};
