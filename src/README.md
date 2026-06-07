# SMAC Backend Integration — Supabase Setup Guide

## Overview of files provided

```
src/
  lib/
    supabase.js              ← Supabase client (one-time setup)
  context/
    AuthContext.jsx          ← Auth state (signIn, signUp, signOut, role)
  hooks/
    useAppointments.js       ← Book, list, update, delete appointments
    useProducts.js           ← Fetch products, place orders (admin CRUD too)
    useDoctors.js            ← Fetch doctors list (admin CRUD too)
    useContact.js            ← Submit contact form, admin read messages
  components/
    ProtectedRoute.jsx       ← Guard admin/doctor routes
  pages/
    Auth.jsx                 ← Auth page wired to Supabase (replaces placeholder)
  App.jsx                    ← Updated with AuthProvider + ProtectedRoute
sql/
  schema.sql                 ← Run this in Supabase SQL Editor first
```

---

## Step 1 — Create Supabase Project

1. Go to [supabase.com](https://supabase.com) → New Project
2. Note your **Project URL** and **anon public key** (Settings → API)

---

## Step 2 — Run the Schema

1. Open **SQL Editor** in Supabase dashboard
2. Paste the contents of `sql/schema.sql`
3. Click **Run**

This creates tables: `profiles`, `doctors`, `appointments`, `products`, `orders`, `contact_messages`

---

## Step 3 — Install Supabase JS

```bash
npm install @supabase/supabase-js
```

---

## Step 4 — Add Environment Variables

Create a `.env` file in your project root:

```env
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

> Make sure `.env` is in your `.gitignore`!

---

## Step 5 — Copy Files Into Your Project

Copy these into your `src/` folder (merge with existing structure):

- `src/lib/supabase.js`
- `src/context/AuthContext.jsx`
- `src/hooks/useAppointments.js`
- `src/hooks/useProducts.js`
- `src/hooks/useDoctors.js`
- `src/hooks/useContact.js`
- `src/components/ProtectedRoute.jsx`

Replace these files:
- `src/pages/Auth.jsx` → use the new version
- `src/App.jsx` → use the new version

---

## Step 6 — Seed Initial Data

### Doctors (paste in Supabase SQL Editor)

```sql
INSERT INTO public.doctors (name, specialty, experience, initials, is_active) VALUES
  ('Vaidh Rajendra Singh',   'Typhoid, Fevers, Migraine & Joint Pain',         '50+ yrs', 'RS', true),
  ('Vaidh Lalitendra Singh', 'Diabetes, Heart, BP, Hormonal & Piles',          '20+ yrs', 'LS', true),
  ('Dr. Mridul Sengar',      'Diagnosis & Personalised Treatment Plans',       'BAMS 2025','MS', true);
```

### Make yourself an admin

After registering via the Auth page, run this in SQL Editor (replace the email):

```sql
UPDATE public.profiles
SET role = 'admin'
WHERE id = (SELECT id FROM auth.users WHERE email = 'your@email.com');
```

### Make a doctor account

```sql
UPDATE public.profiles
SET role = 'doctor'
WHERE id = (SELECT id FROM auth.users WHERE email = 'doctor@email.com');
```

---

## Step 7 — Hook Up Pages

### AppointmentBooking.jsx

```jsx
import { useBookAppointment } from '../hooks/useAppointments';

const { book, loading, error } = useBookAppointment();

// In your handleSubmit (Step 3 confirm):
const result = await book({ ...form, consultType });
if (!result.error) setSubmitted(true);
```

### AdminDashboard.jsx

```jsx
import { useAllAppointments } from '../hooks/useAppointments';
import { useAdminDoctors } from '../hooks/useDoctors';

// Replace: const [appointments, setAppointments] = useState(allAppointments);
const { appointments, loading, updateStatus, deleteAppointment } = useAllAppointments();

// Replace: const [doctors, setDoctors] = useState(doctorsData);
const { doctors } = useAdminDoctors();
```

### DoctorDashboard.jsx

```jsx
import { useDoctorAppointments } from '../hooks/useAppointments';
import { useAuth } from '../context/AuthContext';

const { profile } = useAuth();
const { appointments, loading, updateStatus } = useDoctorAppointments(profile?.full_name);
```

### products.jsx

```jsx
import { useProducts } from '../hooks/useProducts';

// Replace hardcoded product list:
const { products, loading } = useProducts();
```

### Cart.jsx

```jsx
import { usePlaceOrder } from '../hooks/useProducts';

const { placeOrder, loading } = usePlaceOrder();

// On checkout button click:
const { data, error } = await placeOrder(cart, cartTotal);
if (!error) { clearCart(); navigate('/'); }
```

### ContactUs.jsx

```jsx
import { useSendMessage } from '../hooks/useContact';

const { send, loading, error } = useSendMessage();

// In handleSubmit:
const result = await send({ name, email, phone, subject, message });
if (!result.error) setSubmitted(true);
```

### Header.jsx — show user name / logout

```jsx
import { useAuth } from '../context/AuthContext';

const { user, profile, signOut } = useAuth();
// Show profile.full_name and a Sign Out button if user exists
// Show Sign In link if user is null
```

---

## Supabase Auth Settings (Optional)

- **Disable email confirmation**: Supabase Dashboard → Authentication → Settings → Disable "Enable email confirmations" for faster testing
- **OAuth (Google)**: Dashboard → Authentication → Providers → Enable Google (no code changes needed beyond adding google provider)
