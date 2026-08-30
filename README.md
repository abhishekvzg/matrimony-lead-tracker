# Matrimony Lead Tracker

Private, family-shared tracker for marriage prospect leads. Screenshots/text
go in, Gemini extracts structured fields, you confirm/edit, and it lands in
an expandable-row tracker with a per-lead interaction timeline.

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Create a Supabase project

1. Create a project at [supabase.com](https://supabase.com).
2. Open the SQL Editor and run [`supabase/migrations/0001_init.sql`](supabase/migrations/0001_init.sql).
   This creates the `leads`, `attachments`, and `interactions` tables plus the
   private `lead-attachments` storage bucket.
3. From Project Settings → API, copy:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public key** → `NEXT_PUBLIC_SUPABASE_ANON_KEY` (not currently used
     by any client code, but kept for parity with the spec / future use)
   - **service_role key** → `SUPABASE_SERVICE_ROLE_KEY` (server-only — this is
     the key that actually reads/writes data; keep it secret)

### 3. Get a Gemini API key

Create a free key at [aistudio.google.com/apikey](https://aistudio.google.com/apikey)
and set it as `GEMINI_API_KEY`.

### 4. Fill in `.env.local`

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
GEMINI_API_KEY=
APP_PIN=1234
```

`APP_PIN` is the shared 4-digit PIN family members use to unlock the tracker.

### 5. Run it

```bash
npm run dev
```

Open http://localhost:3000 (or the next free port — the dev server will tell
you), enter the PIN, and you're in `/tracker`.

## How it's built

- **Auth**: no accounts — a single PIN checked in `POST /api/auth`, which sets
  an httpOnly session cookie. `proxy.ts` (Next.js 16's replacement for
  `middleware.ts`) gates `/tracker` and the data API routes on that cookie.
- **Data access**: all reads/writes go through `lib/leads.ts` using the
  Supabase **service role** key server-side only (`lib/supabase.ts`). Row
  Level Security is enabled on every table with no public policies, so the
  anon key alone can't read or write anything — by design.
- **Attachments**: the `lead-attachments` bucket is private. Uploaded files
  are stored under `<lead_id>/<uuid>.<ext>`, and the API generates a fresh
  1-hour signed URL each time lead data is fetched, rather than storing a
  URL that would eventually expire.
- **Extraction**: `POST /api/extract` sends the pasted text and/or uploaded
  images straight to Gemini (`gemini-3.6-flash` — `gemini-2.0-flash` was
  retired by Google after this app was first scaffolded) as multipart form data,
  asking for strict JSON matching the lead schema. Fields Gemini can't find
  come back `null` and stay blank in the review form — nothing is guessed.

## Deploying

This is a standard Next.js app — see [Vercel's deployment docs](https://nextjs.org/docs/app/building-your-application/deploying).
Set the same five environment variables in your hosting provider's dashboard
before deploying; nothing else is required.
