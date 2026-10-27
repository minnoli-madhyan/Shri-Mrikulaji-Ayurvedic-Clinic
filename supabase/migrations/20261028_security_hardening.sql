-- supabase/migrations/20261028_security_hardening.sql
--
-- Security hardening. Run once in the Supabase SQL editor (or `supabase db push`).
--   1. Signup can no longer choose its own role (privilege-escalation fix)
--   2. Users can no longer change their own role
--   3. RLS helper functions (no more recursive profiles policies)
--   4. Doctors only see / edit their own appointments
--   5. Guests can only create *pending* appointments; slots cannot be double-booked
--   6. Patients can cancel only their own appointment / order
--   7. Order totals are recomputed from the products table on the server

-- ── 1. handle_new_user: ignore client-supplied role ─────────────────────────
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, phone, role)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'phone',
    'patient'
  );
  RETURN NEW;
END;
$$;

-- ── 3. Role helpers (SECURITY DEFINER avoids recursive RLS on profiles) ────
CREATE OR REPLACE FUNCTION public.current_role_name()
RETURNS TEXT LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(public.current_role_name() = 'admin', FALSE);
$$;

CREATE OR REPLACE FUNCTION public.is_staff()
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(public.current_role_name() IN ('admin', 'doctor'), FALSE);
$$;

-- ── 2. Profiles: block role changes by non-admins ───────────────────────────
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
CREATE POLICY "Admins can view all profiles"
  ON public.profiles FOR SELECT USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;
CREATE POLICY "Admins can update all profiles"
  ON public.profiles FOR UPDATE USING (public.is_admin());

DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE OR REPLACE FUNCTION public.protect_profile_role()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.role IS DISTINCT FROM OLD.role
     AND auth.uid() IS NOT NULL            -- service role / SQL editor are allowed
     AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'Only an admin can change a role';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_profile_role ON public.profiles;
CREATE TRIGGER protect_profile_role
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.protect_profile_role();

-- ── Re-point admin policies at is_admin() ───────────────────────────────────
DROP POLICY IF EXISTS "Only admins can manage doctors" ON public.doctors;
CREATE POLICY "Only admins can manage doctors"
  ON public.doctors FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Only admins can manage products" ON public.products;
CREATE POLICY "Only admins can manage products"
  ON public.products FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admins can manage all orders" ON public.orders;
CREATE POLICY "Admins can manage all orders"
  ON public.orders FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Only admins can view messages"   ON public.contact_messages;
DROP POLICY IF EXISTS "Only admins can update messages" ON public.contact_messages;
DROP POLICY IF EXISTS "Only admins can delete messages" ON public.contact_messages;
CREATE POLICY "Only admins can view messages"
  ON public.contact_messages FOR SELECT USING (public.is_admin());
CREATE POLICY "Only admins can update messages"
  ON public.contact_messages FOR UPDATE USING (public.is_admin());
CREATE POLICY "Only admins can delete messages"
  ON public.contact_messages FOR DELETE USING (public.is_admin());

-- Contact form: sane length limits so the table cannot be stuffed with junk
ALTER TABLE public.contact_messages
  DROP CONSTRAINT IF EXISTS contact_messages_len,
  ADD  CONSTRAINT contact_messages_len CHECK (
    char_length(name) <= 120 AND char_length(email) <= 200 AND char_length(message) <= 4000
  );

-- ── 4 + 5. Appointments ─────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Admins can manage all appointments" ON public.appointments;
DROP POLICY IF EXISTS "Anyone can book an appointment"     ON public.appointments;

-- Admin: everything
CREATE POLICY "Admins can manage all appointments"
  ON public.appointments FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Doctor: only appointments addressed to a doctor row linked to their login
CREATE POLICY "Doctors can view their own appointments"
  ON public.appointments FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.doctors d
    WHERE d.user_id = auth.uid() AND d.name = appointments.doctor_name
  ));

CREATE POLICY "Doctors can update their own appointments"
  ON public.appointments FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.doctors d
    WHERE d.user_id = auth.uid() AND d.name = appointments.doctor_name
  ));

-- Guests / patients: insert only, and only as pending
CREATE POLICY "Anyone can book a pending appointment"
  ON public.appointments FOR INSERT
  WITH CHECK (
    status = 'pending'
    AND (patient_id IS NULL OR patient_id = auth.uid())
    AND char_length(patient_name) <= 120
    AND char_length(COALESCE(notes, '')) <= 2000
  );

-- Patient: may only move their own appointment to 'cancelled'
CREATE POLICY "Patients can cancel their own appointments"
  ON public.appointments FOR UPDATE
  USING (auth.uid() = patient_id AND status IN ('pending', 'confirmed'))
  WITH CHECK (auth.uid() = patient_id AND status = 'cancelled');

-- No double-booking of an active slot (cancelled ones free the slot)
CREATE UNIQUE INDEX IF NOT EXISTS uniq_active_appointment_slot
  ON public.appointments (doctor_name, date, time_slot)
  WHERE status IN ('pending', 'confirmed');

-- ── 6. Orders: patient can cancel own pending order ─────────────────────────
DROP POLICY IF EXISTS "Users can cancel their own orders" ON public.orders;
CREATE POLICY "Users can cancel their own orders"
  ON public.orders FOR UPDATE
  USING (auth.uid() = user_id AND status = 'pending')
  WITH CHECK (auth.uid() = user_id AND status = 'cancelled');

-- Columns the checkout already writes but schema.sql never declared
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS delivery_address TEXT,
  ADD COLUMN IF NOT EXISTS payment_method   TEXT,
  ADD COLUMN IF NOT EXISTS payment_info     TEXT;

-- ── 7. Orders: never trust client prices ────────────────────────────────────
CREATE OR REPLACE FUNCTION public.price_order()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  item      JSONB;
  prod      RECORD;
  qty       INT;
  new_items JSONB := '[]'::jsonb;
  new_total NUMERIC(10, 2) := 0;
BEGIN
  IF NEW.items IS NULL OR jsonb_typeof(NEW.items) <> 'array' OR jsonb_array_length(NEW.items) = 0 THEN
    RAISE EXCEPTION 'Order must contain at least one item';
  END IF;

  FOR item IN SELECT * FROM jsonb_array_elements(NEW.items) LOOP
    qty := COALESCE((item->>'qty')::INT, 0);
    IF qty < 1 OR qty > 50 THEN
      RAISE EXCEPTION 'Invalid quantity for item %', item->>'name';
    END IF;

    SELECT id, name, price INTO prod
      FROM public.products
     WHERE id::text = item->>'id' AND is_active;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Product % is not available', item->>'name';
    END IF;

    new_items := new_items || jsonb_build_object(
      'id', prod.id, 'name', prod.name, 'price', prod.price, 'qty', qty
    );
    new_total := new_total + prod.price * qty;
  END LOOP;

  NEW.items  := new_items;
  NEW.total  := new_total;
  NEW.status := 'pending';
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS price_order ON public.orders;
CREATE TRIGGER price_order
  BEFORE INSERT ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.price_order();

-- ── 8. Images were converted PNG/JPG → WebP; keep stored doctor avatars working ──
UPDATE public.doctors
   SET avatar_url = regexp_replace(avatar_url, '\.(png|jpe?g)$', '.webp', 'i')
 WHERE avatar_url LIKE '/images/%';
