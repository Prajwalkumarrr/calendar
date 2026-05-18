# ElevAIte Calendar

A warm, fast calendar for students and startup teams. Notion-Calendar-inspired, built in the open.

## Stack

| Layer | Tech | Hosted on |
|---|---|---|
| Web (UI + landing) | Next.js 15 (App Router) + TypeScript + Tailwind v4 + NextAuth | Vercel |
| API | Express + TypeScript + Mongoose | Render |
| Database | MongoDB Atlas (M0 free) | Atlas |

Total cost on free tiers: **$0/month** for an MVP.

## Repo layout

```
.
├── prototype/   ← 42 HTML pages from the design phase (reference + deep links)
├── web/         ← Next.js app, deploys to Vercel
│   ├── app/         App Router pages
│   └── public/      Static assets, including the landing.html served at /
├── api/         ← Express API, deploys to Render
│   └── src/
└── README.md
```

## Run locally

You need Node 20+. Open two terminals.

### Terminal 1 — API

```bash
cd api
cp .env.example .env
# Edit .env: paste your MongoDB Atlas connection string into MONGODB_URI
npm install
npm run dev
# → http://localhost:4000/api/health
```

### Terminal 2 — Web

```bash
cd web
cp .env.example .env.local
# Generate a NEXTAUTH_SECRET:  openssl rand -base64 32
npm install
npm run dev
# → http://localhost:3000  (landing)
# → http://localhost:3000/landing.html  (also landing — same thing)
```

The Next.js app proxies any request to `/api/*` to the Express server at `localhost:4000` in dev, and to `NEXT_PUBLIC_API_URL` in production. No CORS pain.

## Get the free-tier accounts

1. **MongoDB Atlas** → [cloud.mongodb.com](https://cloud.mongodb.com) → create M0 free cluster → Connect → Drivers → Node.js → copy connection string → paste into `api/.env`
2. **Vercel** → [vercel.com](https://vercel.com) → sign in with GitHub
3. **Render** → [render.com](https://render.com) → sign in with GitHub

## Deploy

### API to Render
1. Push this repo to GitHub
2. Render dashboard → New → Blueprint → point at the repo
3. Render reads `api/render.yaml` and provisions the service
4. In the service's Environment tab, paste `MONGODB_URI` and `WEB_ORIGIN` (your Vercel URL)

### Web to Vercel
1. Vercel dashboard → Add New → Project → import the GitHub repo
2. Root Directory: `web`
3. Set env vars: `NEXTAUTH_URL`, `NEXTAUTH_SECRET`, `NEXT_PUBLIC_API_URL` (the Render URL)
4. Deploy

The Render free tier spins down after 15 min idle (~30–60s cold start on next request). Fine for MVP; upgrade to the $7/mo "Starter" plan for always-on once you have real users.

## Phases

- ✅ Phase 1 — Foundation: scaffolding, design tokens, landing served at /
- ✅ Phase 2 — Auth + DB: NextAuth (Google), MongoDB adapter, sign-in page, protected dashboard
- ✅ Phase 3 — Calendar core: Event model, CRUD API, week view at `/calendar`
- ✅ Phase 4 — Scheduling links: Calendly-style flow at `/scheduling`, `/book/[slug]`, `/booked/[id]`
- 🛠️ **Phase 5 (in progress)** — Polish + email + remaining pages
- ⏳ Phase 6 — Deploy: push to Vercel + Render + connect Atlas + custom domain

## Set up Resend (email confirmations for bookings)

When someone books a meeting through your `/book/[slug]` link, ElevAIte emails both the invitee and the host. We use [Resend](https://resend.com) — free for 3,000 emails/month.

1. Sign up at [resend.com](https://resend.com) (free, no credit card)
2. Dashboard → **API Keys** → **+ Create API Key** → copy it
3. Paste into `web/.env.local`:
   ```
   RESEND_API_KEY=re_...
   ```
4. Restart `npm run dev`

### Dev mode catch you need to know

Until you verify a custom domain in Resend, you can only send emails to **the address you signed up with**. So bookings from arbitrary invitee emails will silently fail to deliver. This is fine for development — book yourself to test.

### Going to production

When you're ready to send to anyone:
1. Buy a domain (~$10/yr, e.g., through Hostinger or Namecheap) — say `elevaite.app`
2. In Resend → **Domains** → add `elevaite.app` → add the 3 DNS records Resend gives you to your domain registrar
3. Wait ~10 min for verification
4. Update `EMAIL_FROM` in env to `ElevAIte <hi@elevaite.app>`
5. Bookings now email anyone

### What if I don't set RESEND_API_KEY?

The booking flow still works — emails are just logged to the console with `[email]` prefix instead of being sent. No errors. Useful for local testing without an account.

## Set up Google OAuth

NextAuth needs a Google OAuth client. **One-time setup, ~3 minutes.**

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a project (or pick an existing one)
3. Search for **"OAuth consent screen"** in the top bar → click it
4. User type: **External** → Create
5. Fill in:
   - App name: `ElevAIte Calendar`
   - User support email: your email
   - Developer contact email: your email
   - Save and continue through the rest (no scopes needed beyond defaults)
6. Search **"Credentials"** in the top bar → click → **Create Credentials** → **OAuth client ID**
7. Application type: **Web application**
8. Name: `ElevAIte (local)`
9. **Authorized redirect URIs** — add:
   ```
   http://localhost:3000/api/auth/callback/google
   ```
   (When you deploy to Vercel, add your prod URL too: `https://your-domain.vercel.app/api/auth/callback/google`)
10. Click **Create**, copy the **Client ID** and **Client Secret**
11. Paste both into `web/.env.local`:
    ```
    GOOGLE_CLIENT_ID=...
    GOOGLE_CLIENT_SECRET=...
    ```
12. Generate `NEXTAUTH_SECRET`:
    ```
    openssl rand -base64 32
    ```
    Paste it into `web/.env.local`.
13. Add `MONGODB_URI` to `web/.env.local` — **same connection string as `api/.env`** (NextAuth and the API share the cluster).

Restart `npm run dev` after editing env vars. Visit [http://localhost:3000/sign-in](http://localhost:3000/sign-in), click "Continue with Google" → you land on `/dashboard` signed in. Your user is now in the `users` collection in Atlas.

## Prototype

The 42 hand-built HTML pages from the design phase live in `prototype/`. Open `prototype/all-pages.html` in a browser to see every screen — they're the source of truth for visual fidelity during the port.
