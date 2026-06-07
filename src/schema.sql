-- ============================================================
-- SMAC Ayurveda Clinic - Supabase Schema
-- Run this in your Supabase SQL Editor
-- ============================================================

-- Enable UUID extension (already enabled in Supabase by default)
-- CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─── PROFILES ────────────────────────────────────────────────
-- Extends Supabase auth.users
CREATE TABLE IF NOT EXISTS public.profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name   TEXT,
  phone       TEXT,
  role        TEXT NOT NULL DEFAULT 'patient'  -- 'patient' | 'doctor' | 'admin'
                CHECK (role IN ('patient', 'doctor', 'admin')),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles"
  ON public.profiles FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
  ));

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, phone, role)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'phone',
    COALESCE(NEW.raw_user_meta_data->>'role', 'patient')
  );
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- ─── DOCTORS ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.doctors (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID REFERENCES auth.users(id) ON DELETE SET NULL,  -- linked login (optional)
  name             TEXT NOT NULL,
  specialty        TEXT,          -- role/title displayed on card
  tag              TEXT,          -- badge label e.g. 'Founder', 'BAMS'
  experience       TEXT,          -- e.g. '50+ Years'
  patients_treated TEXT,          -- e.g. '10,000+'
  rating           NUMERIC(3,1) DEFAULT 5.0,
  bio              TEXT,
  specialties      TEXT,          -- comma-separated list e.g. "Women's Health,Liver Care"
  availability     TEXT,          -- displayed availability string
  avatar_url       TEXT,
  initials         TEXT,          -- e.g. 'RS'
  color            TEXT DEFAULT 'from-emerald-600 to-emerald-800',  -- Tailwind gradient classes
  is_active        BOOLEAN DEFAULT TRUE,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.doctors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Doctors are viewable by everyone"
  ON public.doctors FOR SELECT USING (TRUE);

CREATE POLICY "Only admins can manage doctors"
  ON public.doctors FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
  ));


-- ─── APPOINTMENTS ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.appointments (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id    UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  patient_name  TEXT NOT NULL,
  patient_phone TEXT NOT NULL,
  patient_email TEXT NOT NULL,
  patient_age   INT,
  patient_gender TEXT,
  doctor_name   TEXT NOT NULL,
  service       TEXT,
  date          DATE NOT NULL,
  time_slot     TEXT NOT NULL,
  consult_type  TEXT NOT NULL DEFAULT 'physical'
                  CHECK (consult_type IN ('physical', 'online')),
  notes         TEXT,
  status        TEXT NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending', 'confirmed', 'completed', 'cancelled')),
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;

-- Patients can see their own appointments
CREATE POLICY "Patients can view their own appointments"
  ON public.appointments FOR SELECT
  USING (auth.uid() = patient_id);

-- Anyone (including unauthenticated) can INSERT (for guest bookings)
CREATE POLICY "Anyone can book an appointment"
  ON public.appointments FOR INSERT WITH CHECK (TRUE);

-- Admins and doctors can view all
CREATE POLICY "Admins can manage all appointments"
  ON public.appointments FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'doctor')
  ));


-- ─── PRODUCTS ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.products (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  description TEXT,
  price       NUMERIC(10, 2) NOT NULL,
  category    TEXT,
  image_url   TEXT,
  stock       INT DEFAULT 100,
  is_active   BOOLEAN DEFAULT TRUE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Products are viewable by everyone"
  ON public.products FOR SELECT USING (TRUE);

CREATE POLICY "Only admins can manage products"
  ON public.products FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
  ));


-- ─── ORDERS ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.orders (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  items        JSONB NOT NULL,   -- [{id, name, price, qty}]
  total        NUMERIC(10, 2) NOT NULL,
  status       TEXT NOT NULL DEFAULT 'pending'
                 CHECK (status IN ('pending', 'processing', 'shipped', 'delivered', 'cancelled')),
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own orders"
  ON public.orders FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can place orders"
  ON public.orders FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can manage all orders"
  ON public.orders FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
  ));


-- ─── CONTACT MESSAGES ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.contact_messages (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT NOT NULL,
  email      TEXT NOT NULL,
  phone      TEXT,
  subject    TEXT,
  message    TEXT NOT NULL,
  is_read    BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.contact_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can send a message"
  ON public.contact_messages FOR INSERT WITH CHECK (TRUE);

CREATE POLICY "Only admins can view messages"
  ON public.contact_messages FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
  ));

CREATE POLICY "Only admins can update messages"
  ON public.contact_messages FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
  ));

CREATE POLICY "Only admins can delete messages"
  ON public.contact_messages FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
  ));


-- ─── MIGRATION: Add missing columns to existing doctors table ─
-- Run these only if your doctors table already exists
ALTER TABLE public.doctors ADD COLUMN IF NOT EXISTS tag              TEXT;
ALTER TABLE public.doctors ADD COLUMN IF NOT EXISTS patients_treated TEXT;
ALTER TABLE public.doctors ADD COLUMN IF NOT EXISTS rating           NUMERIC(3,1) DEFAULT 5.0;
ALTER TABLE public.doctors ADD COLUMN IF NOT EXISTS specialties      TEXT;
ALTER TABLE public.doctors ADD COLUMN IF NOT EXISTS availability     TEXT;
ALTER TABLE public.doctors ADD COLUMN IF NOT EXISTS color            TEXT DEFAULT 'from-emerald-600 to-emerald-800';

-- ─── SEED: Insert default doctors (run once if table is empty) ─
INSERT INTO public.doctors (name, specialty, tag, experience, patients_treated, rating, bio, specialties, availability, initials, color, is_active)
SELECT * FROM (VALUES
  (
    'Vaidh Rajendra Singh',
    'Founder & Ayurvedic Specialist',
    'Founder',
    '50+ Years',
    '10,000+',
    5.0,
    'Established Shree Mrikula Ji Clinic in 1975 with a vision to provide authentic Ayurvedic healing to all — without consulting fees. His deep knowledge of classical Ayurveda has helped thousands regain their health naturally.',
    'Women''s Health,Liver Care,Chronic Fevers,Rasayana Therapy',
    'Mon – Sun, 8:00 AM – 2:00 PM & 4:00 PM – 6:00 PM (Physical) | 6:00 PM – 8:00 PM (Online)',
    'RS',
    'from-emerald-600 to-emerald-800',
    TRUE
  ),
  (
    'Vaidh Lalitendra Singh',
    'Ayurvedic Practitioner & D.Pharma',
    'Herbalist',
    '20+ Years',
    '5,000+',
    4.9,
    'Continuing the family legacy with a formal D.Pharma degree, Vaidh Lalitendra combines traditional herbal knowledge with modern pharmaceutical understanding to craft potent and safe Ayurvedic remedies.',
    'Herbal Formulations,Kidney & Urinary Care,Joint & Bone Pain,Immunity Boosting',
    'Mon – Sun, 8:00 AM – 2:00 PM & 4:00 PM – 6:00 PM (Physical) | 6:00 PM – 8:00 PM (Online)',
    'LS',
    'from-teal-600 to-teal-800',
    TRUE
  ),
  (
    'Dr. Mridul Sengar',
    'BAMS & Diagnostic Specialist',
    'BAMS',
    '8+ Years',
    '2,000+',
    4.8,
    'A formally trained BAMS graduate, Dr. Mridul brings modern diagnostic precision to the clinic. He expertly bridges classical Ayurvedic theory with evidence-based practice for comprehensive patient care.',
    'Panchakarma Therapy,Skin & Hair Care,Digestive Disorders,Stress & Anxiety',
    'Mon – Sun, 8:00 AM – 2:00 PM & 4:00 PM – 6:00 PM (Physical) | 6:00 PM – 8:00 PM (Online)',
    'MS',
    'from-cyan-600 to-cyan-800',
    TRUE
  )
) AS v(name, specialty, tag, experience, patients_treated, rating, bio, specialties, availability, initials, color, is_active)
WHERE NOT EXISTS (SELECT 1 FROM public.doctors LIMIT 1);
