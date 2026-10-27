// src/lib/whatsapp.js
// Calls the send-whatsapp edge function. The function decides who may send what:
//   - admin alerts always go to the clinic's number (set server-side as ADMIN_WHATSAPP)
//   - patient/staff messages need a signed-in user (staff-only for confirmations)
import { supabase } from './supabase';

const SUPABASE_URL      = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
const ADMIN_PLACEHOLDER = '910000000000'; // ignored by the server for admin_* alerts

// Normalize phone: strip +, spaces, dashes → ensure 91XXXXXXXXXX
const normalizePhone = (phone) => {
  let p = String(phone).replace(/[\s\-+]/g, '');
  if (p.startsWith('0')) p = p.slice(1);
  if (!p.startsWith('91')) p = '91' + p;
  return p;
};

export const sendWhatsApp = async (type, phone, data) => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    const res = await fetch(`${SUPABASE_URL}/functions/v1/send-whatsapp`, {
      method: 'POST',
      headers: {
        'Content-Type':  'application/json',
        'apikey':        SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${session?.access_token ?? SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({ type, to: normalizePhone(phone), data }),
    });

    const result = await res.json();

    if (!res.ok) {
      console.error(`[WhatsApp] FAILED type=${type} to=${normalizePhone(phone)}`, result);
      return { result: null, error: result };
    }

    return { result, error: null };

  } catch (err) {
    console.error(`[WhatsApp] Network error type=${type}`, err.message);
    return { result: null, error: err };
  }
};

// ── Convenience wrappers ──────────────────────────────────────

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

// ── Admin alert helpers (server forces the clinic number) ──────────
export const sendAdminOrderAlert = ({ customerName, phone, orderId, items, total }) => {
  return sendWhatsApp('admin_order_alert', ADMIN_PLACEHOLDER, { customerName, phone, orderId, items, total });
};

export const sendAdminApptAlert = ({ patientName, phone, doctorName, dateTime }) => {
  return sendWhatsApp('admin_appt_alert', ADMIN_PLACEHOLDER, { patientName, phone, doctorName, dateTime });
};
