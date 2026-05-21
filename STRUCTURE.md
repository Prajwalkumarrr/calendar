# ElevAIte Calendar — Product Structure & User Flow

A Notion-Calendar–inspired scheduling app that pairs a personal calendar with team workspaces, booking links, multi-person free/busy, and integrations. Built on Next.js 15 + MongoDB. Two primary personas: **students** and **startup employees**.

---

## 1. Tech Stack (one paragraph)

Next.js 15 App Router on the frontend (Vercel), MongoDB Atlas for persistence (single `elevaite` database, ~10 collections), NextAuth for auth (Google OAuth + email+password with 6-digit verification codes via Resend), Tailwind v4 for styling, Geist/Geist Mono fonts, Claude's cream + coral palette (#FAF9F5 / #D97757). External integrations are OAuth-based (Zoom, Google Calendar wired; Slack, Notion, Outlook scaffolded; iCloud planned). An unused Express + Mongoose API layer exists at `api/` for future heavy/scheduled work.

---

## 2. Module Map

### Data layer — `web/lib/`
| File | Owns |
|---|---|
| `mongodb.ts` | Single Mongo client (dev singleton via globalThis) |
| `session.ts` | `getCurrentUser()`, `requireUser()` |
| `auth.ts` | NextAuth config (Google + Credentials provider, JWT sessions) |
| `users.ts` | User CRUD, profile, notification prefs, appearance prefs, verification codes, password hashes |
| `events.ts` | Event docs, recurrence expansion (daily/weekly/monthly/yearly + byWeekday + count/until), `listEventsInRange` (merges Google events) |
| `scheduling.ts` | Scheduling links + bookings + slot generation; createBooking wires Zoom on conferencing=zoom |
| `workspaces.ts` | Workspace + Membership + Invitation; role-checked CRUD |
| `audit.ts` | AuditLog with `logAudit` + `listAudit` (with cached actor display) |
| `notifications.ts` | In-app notifications (inbox) |
| `find-time.ts` | Multi-user free/busy overlap, slot ranking |
| `email.ts` | Resend-backed (or dev-console fallback): verification codes + booking confirmations |
| `integrations.ts` | Integration token storage + 7-provider PROVIDERS metadata + HMAC-signed OAuth state |
| `integrations/zoom.ts` | Zoom OAuth exchange + meeting create + auto-refresh |
| `integrations/google-calendar.ts` | Google Calendar OAuth exchange + read-only event fetch + 60s cache + auto-refresh |
| `useAppearance.ts` / `useTimezones.ts` / `useUnreadCount.ts` | Client hooks with localStorage caching + server sync |

### API layer — `web/app/api/`
- **Auth:** `auth/[...nextauth]`, `auth/signup`, `auth/verify`, `auth/resend-code`
- **Me:** `me`, `me/onboarding`, `me/password`, `me/notifications`, `me/appearance`, `me/timezones`, `me/search` (cmd-K)
- **Events:** `events`, `events/[id]`
- **Scheduling:** `scheduling`, `scheduling/[id]`
- **Public booking:** `public/links/[slug]/slots`, `public/bookings`, `public/bookings/[id]`
- **Bookings (host):** `bookings`
- **Notifications/Inbox:** `notifications`, `notifications/[id]`, `inbox`
- **Workspaces:** `workspaces`, `workspaces/[id]/members`, `workspaces/[id]/invitations`, `workspaces/[id]/invitations/[invId]`, `workspaces/[id]/audit`, `invitations/[token]`
- **Find-time:** `find-time`
- **Integrations:** `integrations`, `integrations/[provider]`, `integrations/[provider]/connect`, `integrations/[provider]/callback`

### UI layer — `web/app/`
Top-level routes (each is a folder with `page.tsx` + a `*App.tsx` client component + scoped CSS):
- **Public/marketing:** `/` (landing), `/sign-in`, `/sign-up`, `/invite/[token]`, `/book/[slug]`, `/booked/[id]`, `/integrations` (dual-purpose marketing + logged-in)
- **Onboarding:** `/onboarding`
- **App shell:** `/home` (dashboard), `/calendar` (week/day/month views + cmd-K palette + EventPanel), `/scheduling`, `/scheduling/new`, `/find-time`, `/inbox`, `/search`, `/timezones`, `/settings` (7 tabs)

---

## 3. Cross-cutting Primitives

These show up in every flow:
- **Cmd-K palette** — jump to events, links, settings, people (early scaffold in calendar)
- **Inbox** — unread badge throughout the app; bookings + workspace events surface here
- **Settings → 7 tabs:** Profile · Calendar accounts · Notifications · Appearance · Keyboard · Account & billing · Workspace
- **Top-right avatar** signs out (planned: dropdown menu)
- **Today auto-redirect** — fresh users land on `/onboarding`; existing users go straight to `/home`

---

## 4. Persona 1 — Student Flow

**Who:** Undergraduate or grad student managing classes, assignment deadlines, group-project syncs, club meetings, and office-hours sign-ups.

**Why ElevAIte beats Google Calendar + Calendly:** one app for personal schedule + booking + group polls; native multi-person free/busy without leaving the calendar; importable from Google Calendar.

### Onboarding (first 90 seconds)

1. Land on `/` (landing page) → click **Get free** → `/sign-up`
2. Pick **Google** (one-tap) or **email + password** → 6-digit code from inbox → verify
3. `/onboarding`:
   - Pick persona: **Student**
   - Pick timezone (auto-detected from `Intl`)
   - Optional: connect Google Calendar via `/integrations` so existing class schedule appears immediately
4. Land on `/home`

### Daily flow — a typical Tuesday

```
07:30  Wake up → opens /home on phone (PWA)
       → "Up next today: 9:00 CS 220 lecture"
       → Imported from Google Calendar
       → Sees Zoom link auto-attached (parsed from event description)

09:00  Class starts (read from Google)

10:30  Free block — uses /calendar to drag a 2hr focus block
       Title: "Study for midterm"  Color: sage

12:00  Group-project partner needs to meet
       → Opens /find-time
       → Selects self + 2 teammates (in shared "Project X" workspace)
       → Duration: 45 min, horizon: 3 days
       → App shows ranked slots ("All free" → "1 conflict (Sam)")
       → Picks Thu 3pm → "Send invites" → emails fire

14:00  Office hours request from a TA's booking link (received via Slack)
       → Clicks the /book/[slug] URL → picks 4:15 PM slot
       → Enters name + email + optional note
       → /booked/[id] confirms; calendar event drops into Google + ElevAIte

20:00  Assignment due tomorrow — adds a deadline event
       → Cmd-K → "new event" → "Final report due 11:59pm"
       → Marks all-day, sets reminder
```

### Weekly flow

- **Sunday night:** opens `/calendar` (month view) — sees the week ahead at a glance
- **Office hours:** creates a recurring scheduling link "Office hours · Tue/Thu 3–5pm" at `/scheduling/new` → posts to course Slack
- **Multi-timezone:** if doing an internship across timezones, adds destination to `/timezones` → gutter shows secondary TZ

### Student-specific features (current + planned)

| Feature | Status |
|---|---|
| Class import (read-only Google Calendar) | ✅ Shipped |
| Recurring class blocks | ✅ Shipped |
| Booking link for "meet with me" (1:1 advisor, study buddy) | ✅ Shipped |
| Find-a-time across study group | ✅ Shipped |
| Office hours queue / sign-up | 🚧 Planned (high impact) |
| Syllabus → events auto-import | 🚧 Planned (uniquely student) |
| Assignment deadline tracking (color-coded) | Partial (any color event works) |
| Mobile PWA polish | 🚧 Planned |

---

## 5. Persona 2 — Startup Employee Flow

**Who:** Founder, designer, engineer, salesperson, or operator at a 2–20 person startup.

**Why ElevAIte beats Google Calendar + Calendly + Cal.com:** native workspace + roles + audit log; Calendly-style booking links built in; multi-person find-a-time without third-party tooling; Zoom auto-creates meetings; team scheduling primitives that Notion Calendar doesn't have.

### Onboarding (founder/admin)

1. `/sign-up` → verify → `/onboarding` → pick **Startup** persona
2. Auto-prompted: **Create your team workspace** ("Polymath AI")
3. `/settings#workspace`:
   - Invite team via email (Owner / Admin / Member / Guest roles)
   - Each invite generates a 14-day token → emailed
4. `/integrations`:
   - Connect **Zoom** → every booking now auto-creates a real Zoom meeting
   - Connect **Google Calendar** → existing meetings show as busy in find-a-time
   - Slack + Notion scaffolded (OAuth scaffolded, exchange pending)

### Onboarding (joining employee)

1. Receives invite email → clicks `/invite/[token]`
2. Three paths:
   - **Signed-out:** sign-up flow + accept on completion
   - **Signed-in, wrong email:** prompted to switch accounts
   - **Signed-in, matching email:** one-click accept → `/home`
3. Lands in workspace; sees teammate roster + shared availability

### Daily flow — a typical workday

```
09:00  Opens /home (web, on laptop)
       → "Up next today: 9:30 standup (recurring)"
       → 3 unread inbox items: new booking, teammate joined,
          someone declined invite

09:30  Standup — Zoom link auto-attached on the event
       → ElevAIte parses link from description, surfaces a Join button
       (planned)

10:30  Sales lead wants to book a call
       → Lead opens elevaite.app/book/sales-30min (your public link)
       → Picks slot → fills form → confirms
       → ElevAIte creates Zoom meeting on YOUR account
       → Event appears in your /calendar with the join URL attached
       → Confirmation emails fire to lead + you

13:00  Design review — need designer + PM + you for 60 min
       → /find-time → select 3 teammates → duration 60min
       → Sees 4 candidate slots ranked by total conflicts
       → Picks Thu 10am → /scheduling/new could create a one-off link
         OR just create the event directly with all 3 attendees

15:30  Customer call (booked yesterday)
       → /home shows the next event with attached note from invitee
       → 5 min before, planned auto-join opens the Zoom link

17:00  Reviews /inbox before logging off:
       - 3 new bookings
       - 1 teammate role-changed (audit-logged)
       - Workspace event from /settings#workspace

23:00  Mobile sanity check before bed — /home shows tomorrow's plan
```

### Weekly flow

- **Monday:** workspace owner reviews `/settings#workspace → Audit log` (last 50 entries: invites, role changes, member joins)
- **Wednesday:** team uses `/find-time` for weekly all-hands
- **Friday:** customer-facing roles share booking links via Slack/LinkedIn; round-robin team scheduling planned

### Startup-specific features (current + planned)

| Feature | Status |
|---|---|
| Workspaces + roles (Owner/Admin/Member/Guest) | ✅ Shipped |
| Email invitations + token acceptance | ✅ Shipped |
| Audit log of workspace actions | ✅ Shipped |
| Booking links (Cal.com-style, public) | ✅ Shipped |
| Zoom auto-meeting on booking | ✅ Shipped (real OAuth) |
| Google Calendar busy-import | ✅ Shipped |
| Multi-person find-a-time | ✅ Shipped |
| Resend / dev-console email notifications | ✅ Shipped |
| Team availability dashboard | 🚧 Planned |
| Round-robin team booking links | 🚧 Planned |
| Outlook sync (Microsoft Graph) | 🚧 Planned |
| Two-way Google sync | 🚧 Planned |
| Slack channel notifications + slash commands | 🚧 Scaffolded |
| Notion page attachment per event | 🚧 Scaffolded |
| AI briefing / meeting prep | 🚧 Planned (north-star differentiator) |

---

## 6. Shared Surfaces (used by both personas)

| Surface | Path | Use |
|---|---|---|
| **Home** | `/home` | Greeting, up-next, today's events, quick-create |
| **Calendar** | `/calendar` | Day/Week/Month views, drag-create, EventPanel side-sheet, Cmd-K |
| **Scheduling links** | `/scheduling`, `/scheduling/new` | Manage public booking pages |
| **Public booking** | `/book/[slug]`, `/booked/[id]` | Invitee-facing slot picker + confirmation |
| **Find a time** | `/find-time` | Multi-user free/busy across a workspace |
| **Inbox** | `/inbox` | Bookings + workspace events + read/unread |
| **Search** | `/search` | Events, links, bookings, people |
| **Timezones** | `/timezones` | Manage secondary TZs (gutter on calendar) |
| **Settings** | `/settings` | Profile · Calendar accounts · Notifications · Appearance · Keyboard · Billing · Workspace |
| **Integrations** | `/integrations` | Connect/disconnect Zoom, Google Calendar, Slack, Notion |

---

## 7. End-to-End Booking Flow (most critical path)

```
  Invitee (no account needed)              Host (signed in)
  ─────────────────────────                 ────────────────
  1. Lands on /book/[slug]
     (GETs link metadata server-side)
  2. Picks date → API hits
     /api/public/links/[slug]/slots
     → server runs generateSlots(link, date, busy)
     → busy = listEventsInRange(host)
        which now includes Google Calendar
  3. Picks slot → fills name + email + note
  4. Submits → POST /api/public/bookings
                                           Server-side:
                                           • Re-validates slot vs busy
                                           • createBooking():
                                             - If link.conferencing=zoom:
                                               createZoomMeeting() →
                                               attaches joinUrl
                                             - Inserts event (host calendar)
                                             - Inserts booking doc
                                           • createNotification() (inbox)
                                           • sendBookingEmails() (Resend)
                                             → invitee gets confirmation
                                             → host gets new-booking
  5. Redirects to /booked/[id]
     (shows confirmation + meeting URL)
```

---

## 8. Recommended "First Week" Flow Posters

Two one-pagers worth printing/sharing in the marketing site:

### **For students** — "Your first week with ElevAIte"
1. **Mon:** Sign up + connect Google Calendar (classes appear automatically)
2. **Tue:** Create a "Meet with me" booking link, share in your group chat
3. **Wed:** Use Find-a-Time with your project group for the next sync
4. **Thu:** Block focus hours; add deadline reminders
5. **Fri:** Add a secondary timezone if your internship is in another city
6. **Sat:** Review next week in month view
7. **Sun:** Tweak your appearance + notification settings

### **For startup teams** — "Your first week with ElevAIte"
1. **Mon:** Owner creates workspace + invites the team
2. **Tue:** Everyone connects Zoom (auto-meetings) + Google Calendar
3. **Wed:** Customer-facing folks publish their booking links
4. **Thu:** Team uses Find-a-Time for the all-hands
5. **Fri:** Review audit log + workspace settings
6. **Sat–Sun:** Optional — set up Slack notifications (when wired)

---

## 9. What's missing from each flow (gaps to close)

For students:
- Syllabus import, office hours queue, mobile PWA polish, assignment-deadline view, course-calendar sharing

For startups:
- Two-way Google sync, Outlook, Slack wiring, team availability dashboard, round-robin links, AI briefing, native Notion page attachment, auto-join meetings 5 sec before start

See **BUGS.md** for bug + security findings that should be fixed before pushing these flows in front of real users.
