# ElevAIte Calendar — Bug Audit

Comprehensive audit of `web/lib`, `web/app/api`, and `web/app/**/*.tsx`. Findings are grouped by severity, then by area. File:line references are accurate at time of audit.

**Counts** — Critical: 7 · High: 19 · Medium: 22 · Low: 27

---

## Critical (ship-blocking — fix before deploy)

### C1. Invitation acceptance does not verify accepting user's email matches invitation
- **File:** `web/app/api/invitations/[token]/route.ts:27-42` and `web/lib/workspaces.ts:282-300`
- **Bug:** POST accepts any token from any signed-in user. Server never compares the invitation's `email` to the current user's email — only the UI does. A leaked token (forwarded email, Slack paste, server log) lets *any* attacker hijack the membership.
- **Fix:** In the POST handler, fetch `getCurrentUser()` + `findInvitationByToken(token)` and `return 403` unless emails match case-insensitively. Also atomicize `acceptInvitation` with `findOneAndUpdate({ token, acceptedAt: { $exists: false } }, ...)`.

### C2. Public booking GET leaks invitee PII to anyone with a guessable ID
- **File:** `web/app/api/public/bookings/[id]/route.ts:5-15`
- **Bug:** Returns `inviteeEmail`, `inviteeName`, `note`, `meetingUrl` with no auth, no token. MongoDB ObjectIds embed timestamp + counter — neighbors are walkable, and `/booked/<id>` pages are Google-indexable.
- **Fix:** Add a random opaque `confirmationToken` to each booking; require it as `?token=...`; only return PII when it matches.

### C3. Public booking POST has no length limits or rate limiting
- **File:** `web/app/api/public/bookings/route.ts:10-84`
- **Bug:** `name`, `note` can be any size (multi-MB), stored verbatim, fanned out to email + inbox. No IP throttling, no slug throttling.
- **Fix:** Cap `name` (80), `note` (500); add IP + slug rate-limit (e.g. 5 bookings/min/slug).

### C4. OAuth state uses non-constant-time compare, no expiry, no session binding
- **Files:** `web/lib/integrations.ts:212-228`, `web/app/api/integrations/[provider]/callback/route.ts:10-50`
- **Bug:** `expected !== sig` is timing-attackable; payload has no timestamp; callback never asserts `session.user.id === parsedState.userId`. Captured state is replayable forever; phishing flow can attach attacker tokens to a victim's user id.
- **Fix:** Use `crypto.timingSafeEqual`; embed expiry (~10 min) in signed payload; require `requireUser()` in callback + assert state userId matches session.

### C5. `updateMemberRole` / `removeMember` library helpers have no auth checks
- **File:** `web/lib/workspaces.ts:188-203`
- **Bug:** Helpers accept any `userId` and write the membership without verifying actor role or guarding the owner. The route handler enforces it, but any future caller that forgets the gate becomes an instant privilege-escalation. Combined with C6, admins can demote owners.
- **Fix:** Take an `actorUserId`, look up role internally, refuse to remove/demote the last owner, refuse owner reassignment except via explicit transfer-ownership API.

### C6. Admin can demote the owner via PATCH members (bypass DELETE guard)
- **File:** `web/app/api/workspaces/[id]/members/route.ts:24-61`
- **Bug:** Route blocks `role === 'owner'` on promotion but never checks the *target's* current role. An admin sets the owner to `member`, then deletes them. DELETE's "owner can't be removed" guard is bypassed.
- **Fix:** Reject PATCH where `prevRole === 'owner'`; only the owner can transfer ownership.

### C7. Slug uniqueness has TOCTOU race in `createLink` and `createWorkspace`
- **Files:** `web/lib/scheduling.ts:158-162`, `web/lib/workspaces.ts:106-109`
- **Bug:** Read-then-write loop (`findOne` → `insertOne`) with no unique index. Concurrent creates collide. Public booking `/book/[slug]` then resolves to whichever host the DB returns first — the other host's bookings vanish into the wrong account.
- **Fix:** Add unique Mongo index on `slug`; retry with suffix on duplicate-key error.

---

## High (fix before public beta)

### H1. Verification code is brute-forceable
- **Files:** `web/app/api/auth/verify/route.ts`, `web/app/api/auth/resend-code/route.ts`
- **Bug:** 6-digit code, 10-min window, no attempt counter, no rate limit. Hundreds of requests/sec → likely hit in seconds.
- **Fix:** Track `verificationAttempts`; invalidate code after 5 wrong tries; IP+email rate-limit verify (10/min) and resend (1/min).

### H2. `requireUser` throws a `Response` but route handlers don't catch it
- **File:** `web/lib/session.ts:26-32`
- **Bug:** Unauthenticated calls hit a 500 instead of 401 — every caller silently relies on a try/catch wrapper. Logs leak stack + request context.
- **Fix:** Return `{ user } | { response }` and let callers `if (...) return r.response`, or use a `withUser(handler)` factory.

### H3. `acceptInvitation` token race lets two users claim the same token
- **File:** `web/lib/workspaces.ts:282-300`
- **Bug:** Read-then-write without atomic guard. Two concurrent accepts both insert memberships.
- **Fix:** `findOneAndUpdate({ token, acceptedAt: { $exists: false } }, { $set: { acceptedAt: new Date() } })`; bail if null.

### H4. `/api/find-time` accepts arbitrary member IDs with no workspace gate
- **File:** `web/app/api/find-time/route.ts:5-40`
- **Bug:** Any signed-in user can probe the busy/free schedule of any other user by guessing IDs.
- **Fix:** Require `workspaceId`; verify caller is a member; intersect `memberIds` with that workspace's memberships.

### H5. Self-PATCH / admin-griefing on workspaces/members
- **File:** `web/app/api/workspaces/[id]/members/route.ts:24-61`
- **Bug:** No check that `body.userId !== user.id`; admin can change own role; admin can demote other admins to guest.
- **Fix:** Forbid self-PATCH except explicit downgrade; admin→admin promotion only by owner.

### H6. Google refresh-token rotation drops the rotated token
- **File:** `web/lib/integrations/google-calendar.ts:53-61`
- **Bug:** `refreshToken: refreshToken` saves the OLD token rather than `data.refresh_token ?? refreshToken`. On rotation, next refresh fails with `invalid_grant`; user silently loses sync.
- **Fix:** `refreshToken: data.refresh_token ?? refreshToken` and surface refresh failures.

### H7. Token-refresh thundering herd
- **Files:** `web/lib/integrations/zoom.ts:40-49`, `web/lib/integrations/google-calendar.ts:64-72`
- **Bug:** Two concurrent calls at expiry both refresh; second `saveTokens` overwrites first; if Google rotated, the older response wins.
- **Fix:** Single-flight refresh per (userId, provider) via promise cache or `findOneAndUpdate` soft-lock.

### H8. Google cache key uses ms-precision range — cache almost never hits
- **File:** `web/lib/integrations/google-calendar.ts:145-147`
- **Bug:** Callers compute `from`/`to` per request with sub-second jitter → every render re-fetches Google → burns quota.
- **Fix:** Round to minute/hour, or key only by `userId` and intersect ranges in memory.

### H9. `markEmailVerified(userId)` accepts any userId, no code check
- **File:** `web/lib/users.ts:187-198`
- **Bug:** Helper name + signature invite IDOR; no `modifiedCount` check; always returns `true`.
- **Fix:** Take `(userId, code)`, match `_id` + unexpired code in the filter, return `matchedCount === 1`.

### H10. Weekly recurrence count drift
- **File:** `web/lib/events.ts:100-126`
- **Bug:** With `byWeekday` + `count`, occurrences before `from` count against the limit; series queried far in the future returns 0 instances when many remain. Also O(N) day-walk per series.
- **Fix:** Count emissions from `doc.start` in absolute terms; jump walker to `from` first.

### H11. Recurrence expansion uses server local time — DST + last-day-of-month broken
- **File:** `web/lib/events.ts:103-149`
- **Bug:** `setDate`/`setMonth`/`setHours` operate in server TZ. A "daily 9am PT" event drifts ±1h across DST; "monthly Jan 31" silently disappears in 30-day months.
- **Fix:** Store/expand in user's IANA TZ via `luxon` or `date-fns-tz`; clamp monthly day.

### H12. `acceptInvitation` lacks email-match guard (server side)
- **File:** `web/lib/workspaces.ts:282-300` (see C1)
- Listed under critical; mirrored here for the lib helper.

### H13. `listMembers` / `listInvitations` helpers have no role check
- **File:** `web/lib/workspaces.ts:166-186, 236-250`
- **Bug:** Routes gate access today, but `listInvitations` returns raw tokens — any future route that uses these helpers without re-gating leaks them.
- **Fix:** Take `actorUserId` and check role internally; *never* return `token`; expose a separate "copy invite link" endpoint that re-checks role.

### H14. Calendar drag-to-create leaks `mousemove` listener per drag
- **File:** `web/app/calendar/CalendarApp.tsx:227-275`
- **Bug:** Reassigned-per-render refs mean cleanup removes a different function reference than the one registered. Each drag leaks a listener; long sessions degrade.
- **Fix:** Stable handler in `useRef`; register/unregister exact same function reference.

### H15. Booking flow keyboard trap on slot select
- **File:** `web/app/book/[slug]/BookingFlow.tsx:287-307`
- **Bug:** Selected slot becomes a `disabled` button → keyboard focus jumps unexpectedly; users can't deselect.
- **Fix:** Render selected slot as enabled, styled-selected button that toggles back on click.

### H16. SSR/hydration mismatch on theme
- **Files:** `web/app/home/HomePage.tsx:129-132`, `web/app/calendar/CalendarApp.tsx:108-110`, `web/app/inbox/InboxApp.tsx:72-74`
- **Bug:** `window.matchMedia` consulted during render → SSR returns light, client may return dark → hydration warning + flash for dark-preferring users.
- **Fix:** Defer theme to `useEffect`+state, or adopt `next-themes`.

### H17. SSR/hydration mismatch on public URL preview
- **File:** `web/app/scheduling/new/SchedulingCreateForm.tsx:122`
- **Bug:** `window.location.host` read in render. SSR renders `elevaite.app`, client renders real host.
- **Fix:** Read after mount, or use relative `/book/${slug}`.

### H18. Inbox can enter infinite PATCH loop on stale data
- **File:** `web/app/inbox/InboxApp.tsx:87-90`
- **Bug:** If server returns `read:false` after a PATCH succeeds, the effect re-PATCHes forever.
- **Fix:** Local `Set<string>` of already-marked IDs; skip when present.

### H19. Sign-up: password lost mid-flow, silent sign-in failure
- **File:** `web/app/sign-up/SignUpForm.tsx:119-129`
- **Bug:** If `password` state is empty when verify completes (e.g. reload), `signIn('credentials')` silently fails. User is bounced to `/sign-in` without explanation.
- **Fix:** If `!password`, redirect to `/sign-in?email=…&verified=1` with explanatory copy.

---

## Medium (fix before charging money)

### M1. `createBooking` is non-atomic — orphan Zoom meetings + double-bookings
- **File:** `web/lib/scheduling.ts:262-313`
- **Bug:** Zoom meeting creates before event; event creates before booking; no overlap check inside the transaction. Races double-book; partial failure leaves orphans.
- **Fix:** Wrap in Mongo session/transaction; compound conditional insert on `{ownerId, start}`; rollback Zoom on failure.

### M2. `updateEvent` allows ownerId injection via `$set` spread
- **File:** `web/lib/events.ts:248-263`
- **Bug:** User PATCH body spreads into `$set`. `ownerId` reassignment transfers events to other users' calendars.
- **Fix:** Whitelist patchable fields.

### M3. `users.ts` updateProfile etc. trust caller-supplied id
- **File:** `web/lib/users.ts:264-325`
- **Bug:** Each helper takes `id` with no actor-vs-target distinction. A typo in a route handler becomes full account takeover.
- **Fix:** Rename to `updateMyProfile(actorId, patch)` and remove the targetable form, or always assert `actorId === id`.

### M4. PATCH `/api/events/[id]` accepts megabyte titles/descriptions
- **Files:** `web/app/api/events/route.ts`, `web/app/api/events/[id]/route.ts`
- **Bug:** Only `typeof === 'string'`; no length cap.
- **Fix:** Slice to sane caps (200/200/5000).

### M5. PATCH `/api/scheduling-links/[id]` accepts arbitrary durations and workingHours shapes
- **File:** `web/app/api/scheduling/[id]/route.ts`
- **Bug:** No `DURATION_OPTIONS` check; no HH:MM regex on `workingHours`. Bad shapes can produce infinite loops in `generateSlots`.
- **Fix:** Reuse POST validation.

### M6. Slot generation snapshots "now" once — stale slots accepted on booking
- **File:** `web/lib/scheduling.ts:236-244`
- **Bug:** Page loads at 9:00 with 9:15 slot available; user submits at 9:20; `createBooking` doesn't re-check `start > now + minLeadTime`.
- **Fix:** Re-validate in `createBooking`.

### M7. Email HTML interpolates unescaped invitee/host names — XSS in some clients
- **File:** `web/lib/email.ts:154-174`
- **Bug:** Only `note` is partially escaped (just `<`). Attacker books with `name = "<a href='evil'>…"` and your notification email renders markup.
- **Fix:** Centralize `escapeHtml(str)` and apply to every interpolation.

### M8. Find-time helper has no defense-in-depth
- **File:** `web/lib/find-time.ts:43-56`
- **Bug:** Loads each member's events with no actor check. Route gates today, but the helper is reusable.
- **Fix:** Take `actorUserId`; verify shared workspace.

### M9. `listEventsInRange` recurrence query has no `until` short-circuit
- **File:** `web/lib/events.ts:163-174`
- **Bug:** Returns *every* recurring event ever, then expands in JS only to drop expired series. O(N) per render for heavy users.
- **Fix:** Add `'recurrence.until': { $gte: from }` (or `$exists: false`) to the recurrence branch.

### M10. Audit-log writes are post-mutation and uncaught
- **File:** `web/lib/audit.ts:67-84`
- **Bug:** Mutation commits first; if `logAudit` throws or is unawaited, forensic trail breaks silently.
- **Fix:** Either inside transaction, or try/catch + fire-and-forget with retry.

### M11. `markEmailVerified` returns `true` for non-existent userId
- **File:** `web/lib/users.ts:187-198`
- **Bug:** No `matchedCount` check.
- **Fix:** Return `res.matchedCount === 1`.

### M12. `/api/integrations/[provider]` DELETE doesn't validate provider
- **File:** `web/app/api/integrations/[provider]/route.ts:6-19`
- **Bug:** Casts to `ProviderId` with no `getProvider()` check. Hits Mongo with random strings.
- **Fix:** 404 unknown_provider first.

### M13. `/api/public/bookings` computes `end` before NaN check
- **File:** `web/app/api/public/bookings/route.ts:24-27`
- **Bug:** `end = new Date(start + ...)` runs even if start is NaN. Benign today, latent footgun.
- **Fix:** NaN-check first.

### M14. `/api/search` allows 1-char queries → 3 full-collection regex scans
- **File:** `web/app/api/search/route.ts`
- **Bug:** Trivially DoS-able by looping `?q=a`.
- **Fix:** Require `q.length >= 2`.

### M15. `/api/me/onboarding` accepts arbitrary persona strings
- **File:** `web/app/api/me/onboarding/route.ts:16-28`
- **Bug:** Just a TS cast — `{persona:"hacker"}` is stored; UI assumes one of three.
- **Fix:** Enum check.

### M16. `_silent` flag on `/api/me` is client-controllable
- **File:** `web/app/api/me/route.ts:19-49`
- **Bug:** User-controlled body field gates notification firing.
- **Fix:** Remove `_silent` from the public API; use an internal helper.

### M17. Settings tab race writes wrong hash to history
- **File:** `web/app/settings/SettingsApp.tsx:1184-1192`
- **Bug:** Two effects fire on first mount; one reads `#workspace` and switches tab, the other replaces hash with `#profile` first → corrupted browser history.
- **Fix:** `useRef` "mounted" guard on the hash-write effect.

### M18. Sign-in page swallows `email_not_verified` error
- **File:** `web/app/sign-in/page.tsx:21-29`
- **Bug:** Maps only `CredentialsSignin` to "didn't match" → unverified users see the wrong message.
- **Fix:** Add explicit case.

### M19. Booking flow: success leaves `submitting=true` forever on failed redirect
- **File:** `web/app/book/[slug]/BookingFlow.tsx:138-160`
- **Bug:** No `finally` reset. Spotty network → stuck "Scheduling…" forever.
- **Fix:** Reset on push completion or use `router.replace` with handler.

### M20. SearchApp doesn't sync `q` state with changing `searchParams`
- **File:** `web/app/search/SearchApp.tsx:37`
- **Bug:** `useState(initialQ)` reads once; navigating `/search?q=foo` → `/search?q=bar` keeps the old input.
- **Fix:** `useEffect(() => setQ(initialQ), [initialQ])` or use `useSearchParams` live.

### M21. Onboarding "Skip" routes to `/calendar` which redirects back to `/onboarding` → loop
- **File:** `web/app/onboarding/OnboardingFlow.tsx:72`
- **Bug:** Skip doesn't POST `/api/me/onboarding`; server still thinks user is unonboarded.
- **Fix:** Skip should call onboarding API with default persona, then redirect.

### M22. `/booked/[id]` is a public receipt of invitee PII
- **File:** `web/app/booked/[id]/page.tsx:35-46`
- **Bug:** Page shows invitee email + note to anyone with the URL.
- **Fix:** Same opaque token approach as C2.

---

## Low (polish, defense-in-depth, future-proofing)

| # | Area | Summary | File |
|---|------|---------|------|
| L1 | scheduling | `slugify` random fallback uses Math.random (~26 bits) | `lib/scheduling.ts:116-122` |
| L2 | auth | `auth.ts` doesn't centralize bcrypt rounds; verify ≥12 at hash site | `lib/auth.ts:34` |
| L3 | users | Reserved-handles only enforced in update, not in deriveHandle | `lib/users.ts:281-289` |
| L4 | mongo | Production `mongodb.ts` doesn't reuse global client across module loads | `lib/mongodb.ts:22-23` |
| L5 | inbox | `useUnreadCount` lacks `refresh()` — badge stale up to 30s after mark-read | `lib/useUnreadCount.ts` |
| L6 | tz | `useTimezones` hydration overwrites local edits if GET resolves late | `lib/useTimezones.ts:48-63` |
| L7 | oauth | OAuth state separator `.` will break if any provider id contains `.` | `lib/integrations.ts:213,222` |
| L8 | workspaces | No per-user workspace count cap | `lib/workspaces.ts:101-133` |
| L9 | scheduling | No pagination on listLinks/listInvitations/listAudit | various |
| L10 | api/auth | Signup 409 enumerates which emails are registered | `api/auth/signup/route.ts:34-46` |
| L11 | api/me | Timezone label trim-then-empty falls through to derived label | `api/me/timezones/route.ts:40-50` |
| L12 | api/inbox | "unknown action" returned for empty body — should be "missing_action" | `api/inbox/route.ts:23-37` |
| L13 | api/workspaces | Workspace name not sanitized (defense-in-depth XSS) | `api/workspaces/route.ts:18-38` |
| L14 | home | Week number formula is bogus (`Math.ceil(now/86400000+1)/7 % 53`) | `app/home/HomePage.tsx:390` |
| L15 | calendar | `now = new Date()` at render scope; "today" pill sticks across midnight | `app/calendar/CalendarApp.tsx:130-131` |
| L16 | calendar | Cmd-K palette hover steals idx from keyboard nav | `app/calendar/CommandPaletteProto.tsx:207` |
| L17 | calendar | `MonthView` uses `new Date()` at render → "today" stale across midnight | `app/calendar/MonthView.tsx:54` |
| L18 | settings | Notification SwitchRows allow rapid toggles → out-of-order PATCHes | `app/settings/SettingsApp.tsx:418-442` |
| L19 | settings | Invite modal backdrop click loses typed email | `app/settings/SettingsApp.tsx:1121-1128` |
| L20 | a11y | No focus trap on EventPanel / InviteMemberModal | various modals |
| L21 | booked | Reschedule/Cancel buttons link to `/reschedule.html` (doesn't exist) | `app/booked/[id]/page.tsx:126-127` |
| L22 | booked | Server renders datetime in server TZ (UTC on Vercel), not user TZ | `app/booked/[id]/page.tsx:50` |
| L23 | scheduling | "Preview as invitee" opens dead URL before first save | `app/scheduling/new/SchedulingCreateForm.tsx:141-148` |
| L24 | calendar | EventPanel Busy/Free/Private toggles never sent to API | `app/calendar/EventPanel.tsx:330-339` |
| L25 | book | Phone field silently dropped into `note`; promised SMS not implemented | `app/book/[slug]/BookingFlow.tsx:147-151` |
| L26 | integrations | Success/error banner sticks in URL — back-button shows stale banner | `app/integrations/IntegrationsApp.tsx:129-133` |
| L27 | timezones | Invalid IANA name persists and crashes `useTzClocks` | `app/timezones/TimezonesApp.tsx:75-88` |
| L28 | nav | Avatar click signs out with no menu/confirmation | `home/HomePage.tsx:290-296`, `calendar/CalendarApp.tsx:357-363` |
| L29 | onboarding | localStorage flag set even if server POST fails → loop on next session | `app/onboarding/OnboardingFlow.tsx:40-55` |

---

## Suggested fix order

1. **Same-day:** C1, C2, C3 (PII leaks + DoS surface)
2. **This week:** C4, C5, C6, C7 (auth + concurrency)
3. **Next week:** H1–H11 (recurrence, rate-limits, hydration)
4. **Next sprint:** M1–M22 (data integrity + UX correctness)
5. **As you touch the area:** Low-severity items
