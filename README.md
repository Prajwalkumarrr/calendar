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

- ✅ **Phase 1 — Foundation** (you are here): scaffolding, design tokens, landing served at /
- ⏳ Phase 2 — Auth + DB: NextAuth (Google), User/Session models, sign-in page
- ⏳ Phase 3 — Calendar core: Event model, CRUD API, port week view
- ⏳ Phase 4 — Scheduling links: Link/Booking models, port create/book/booked/reschedule
- ⏳ Phase 5 — Settings + remaining pages: port settings, profile, mobile, etc.
- ⏳ Phase 6 — Deploy: push to Vercel + Render + connect Atlas + custom domain

## Prototype

The 42 hand-built HTML pages from the design phase live in `prototype/`. Open `prototype/all-pages.html` in a browser to see every screen — they're the source of truth for visual fidelity during the port.
