# SMAC — Update Bundle v2

## Files to Replace

| File | Path in Project |
|------|----------------|
| `History.jsx` | `src/pages/History.jsx` |
| `App.jsx` | `src/App.jsx` |
| `AuthContext.jsx` | `src/context/AuthContext.jsx` |
| `AppointmentBooking.jsx` | `src/pages/AppointmentBooking.jsx` |
| `Header.jsx` | `src/components/Header.jsx` |
| `useProducts.js` | `src/hooks/useProducts.js` |
| `useAppointments.js` | `src/hooks/useAppointments.js` |

---

## What Changed

### 1. History Page — Full Redesign with Real Data
- **All dummy data removed** — fetches from Supabase via `useMyAppointments()` and new `useMyOrders()` hook
- **Beautiful new design** — emerald hero header with stats, card-based layout with accent bars, grouped "Upcoming" / "Past" sections
- **Login gate** — unauthenticated users see a friendly sign-in prompt instead of the page
- **Cancel appointment** — saves `status: 'cancelled'` to Supabase if booking is >12 hours away
- **Cancel order** — saves `status: 'cancelled'` to Supabase if status is `pending` or `processing`
- **Search** — filters across both tabs in real time
- **Item details** — order cards show individual product names and quantities from the `items` JSON column

### 2. Post-Appointment Booking Redirect (Role-Aware)
After a patient, doctor, or admin books an appointment and clicks the confirmation button:
- **Patient** → `/history` (so they can see their new booking immediately)
- **Doctor** → `/doctor-dashboard`
- **Admin** → `/admin-dashboard`

### 3. Login Redirect Fixed for Patients
After sign-in, patients land on `/history` (not `/` or `/patient-dashboard`).

### 4. History Nav Link Restored
- "History" is back in the main nav
- For logged-in patients, the header user dropdown shows **"My History"** as their quick link
- Admin/Doctor still get "Dashboard" in the dropdown

### 5. PatientDashboard Retired
- `/patient-dashboard` route removed — `History.jsx` is the patient's home base
- `PatientDashboard.jsx` file can be deleted (no longer imported)

---

## Hook Changes

### `useMyAppointments` (useAppointments.js)
Added `cancelAppointment(id)` — optimistic UI update (DB update done by History.jsx directly).

### `useMyOrders` (useProducts.js) — NEW
```js
const { orders, loading, cancelOrder } = useMyOrders();
```
Fetches the logged-in patient's orders. `cancelOrder(id)` is an optimistic update.

---

## Supabase Requirements

Orders table must have:
- `user_id` (uuid, FK to auth.users)
- `items` (jsonb — array of `{id, name, price, qty}`)
- `total` (numeric)
- `status` (text: `pending` | `processing` | `delivered` | `cancelled`)
- `created_at` (timestamptz, default now())
