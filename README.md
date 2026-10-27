# 🌿 Shree Mrikula Ji Ayurvedic Clinic — [shrimac.com](https://shrimac.com)

Website and clinic-management app: appointment booking, products & cart, blogs, doctor and admin dashboards, WhatsApp notifications, Hindi / English.

## Tech stack
- **Frontend:** React 19, Vite, Tailwind CSS, Framer Motion, react-i18next
- **Backend:** Supabase (Postgres + Row Level Security, Auth, Storage, Edge Functions in Deno) — there is no separate Express server
- **Messaging:** WhatsApp Cloud API (Meta) via Supabase Edge Functions
- **Hosting:** Firebase Hosting

## Project structure
```
src/
  components/   reusable UI (+ admin/ modals)
  context/      Auth and Cart providers
  hooks/        Supabase data hooks
  i18n/, locales/   translations (en, hi)
  lib/          supabase client, WhatsApp helper, storage helpers
  pages/        route components (lazy-loaded)
supabase/
  schema.sql    base schema
  migrations/   run in order; 20261028_security_hardening.sql is required
  functions/    send-whatsapp, whatsapp-webhook, appointment-reminders
scripts/        optimize-images.mjs
docs/           extra notes
```

## Local setup
```bash
npm install
cp .env.example .env     # fill in VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY
npm run dev
```
Other scripts: `npm run build`, `npm run lint`, `npm run optimize:images`.

## Database
Run `supabase/schema.sql`, then every file in `supabase/migrations/` in date order.
Admin and doctor accounts are **not** self-service: create the user, then set the role from the
Supabase SQL editor — `update profiles set role = 'admin' where id = '<user id>';`

## Edge function secrets
Set in Supabase → Edge Functions → Secrets:
`WHATSAPP_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_APP_SECRET`, `WHATSAPP_WEBHOOK_VERIFY_TOKEN`,
`ADMIN_WHATSAPP` (e.g. `919876543210`), optional `ALLOWED_ORIGINS`.

Deploy: `supabase functions deploy send-whatsapp whatsapp-webhook appointment-reminders`.
The reminders cron job must send `Authorization: Bearer <service-role key>` (the function rejects any other role) (see the SQL in the reminders migration).

## Deploy
```bash
npm run build && firebase deploy --only hosting
```

## Security notes
- Roles are assigned only by an admin / the database, never from signup metadata.
- Order totals are recomputed in Postgres from the `products` table.
- `.env`, `supabase/.temp` and `.firebase` are git-ignored; never commit a service-role key.
