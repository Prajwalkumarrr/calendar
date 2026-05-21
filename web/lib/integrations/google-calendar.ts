import { getIntegration, saveTokens } from '@/lib/integrations';

const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const API_BASE = 'https://www.googleapis.com/calendar/v3';

type GoogleTokenResponse = {
  access_token: string;
  refresh_token?: string;
  token_type: string;
  expires_in: number;
  scope: string;
  id_token?: string;
};

type GoogleEvent = {
  id: string;
  status?: 'confirmed' | 'tentative' | 'cancelled';
  summary?: string;
  description?: string;
  location?: string;
  start?: { dateTime?: string; date?: string; timeZone?: string };
  end?: { dateTime?: string; date?: string; timeZone?: string };
  hangoutLink?: string;
  conferenceData?: { entryPoints?: { uri?: string; entryPointType?: string }[] };
  htmlLink?: string;
};

type GoogleEventsResponse = {
  items?: GoogleEvent[];
  nextPageToken?: string;
};

async function refreshGoogleToken(userId: string, refreshToken: string): Promise<string | null> {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) return null;
  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
    client_id: clientId,
    client_secret: clientSecret,
  });
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  if (!res.ok) {
    console.error('[google-calendar] refresh failed:', res.status, await res.text());
    return null;
  }
  const data: GoogleTokenResponse = await res.json();
  await saveTokens({
    userId,
    provider: 'google-calendar',
    accessToken: data.access_token,
    refreshToken,
    expiresIn: data.expires_in,
    scope: data.scope,
  });
  return data.access_token;
}

async function getValidGoogleToken(userId: string): Promise<string | null> {
  const integration = await getIntegration(userId, 'google-calendar');
  if (!integration) return null;
  if (integration.expiresAt && integration.expiresAt.getTime() - Date.now() < 60_000) {
    if (!integration.refreshToken) return null;
    return refreshGoogleToken(userId, integration.refreshToken);
  }
  return integration.accessToken;
}

/** Exchange an OAuth code for tokens + persist. Returns true on success. */
export async function exchangeGoogleCalendarCode(args: {
  userId: string;
  code: string;
  redirectUri: string;
}): Promise<boolean> {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) return false;
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code: args.code,
    redirect_uri: args.redirectUri,
    client_id: clientId,
    client_secret: clientSecret,
  });
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  if (!res.ok) {
    console.error('[google-calendar] token exchange failed:', res.status, await res.text());
    return false;
  }
  const data: GoogleTokenResponse = await res.json();

  // Fetch the user's primary calendar / profile for accountInfo
  let accountInfo: { id?: string; email?: string; name?: string } | undefined;
  try {
    const me = await fetch(`${API_BASE}/calendars/primary`, {
      headers: { Authorization: `Bearer ${data.access_token}` },
    });
    if (me.ok) {
      const cal = await me.json();
      accountInfo = { id: cal.id, email: cal.id, name: cal.summary };
    }
  } catch {
    /* non-fatal */
  }

  await saveTokens({
    userId: args.userId,
    provider: 'google-calendar',
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresIn: data.expires_in,
    scope: data.scope,
    accountInfo,
  });
  return true;
}

// ── Read-only event fetch with in-memory cache ─────────────────────

export type GoogleCalendarEvent = {
  id: string;
  title: string;
  start: Date;
  end: Date;
  allDay: boolean;
  location?: string;
  description?: string;
  meetingUrl?: string;
  htmlLink?: string;
};

type CacheEntry = { fetchedAt: number; events: GoogleCalendarEvent[] };
const CACHE_TTL_MS = 60_000;
const cache = new Map<string, CacheEntry>();

function cacheKey(userId: string, from: Date, to: Date) {
  return `${userId}::${from.getTime()}::${to.getTime()}`;
}

function parseGoogleDate(d?: { dateTime?: string; date?: string }): { date: Date; allDay: boolean } | null {
  if (!d) return null;
  if (d.dateTime) return { date: new Date(d.dateTime), allDay: false };
  if (d.date) return { date: new Date(`${d.date}T00:00:00`), allDay: true };
  return null;
}

function pickMeetingUrl(ev: GoogleEvent): string | undefined {
  if (ev.hangoutLink) return ev.hangoutLink;
  const ep = ev.conferenceData?.entryPoints?.find((e) => e.entryPointType === 'video');
  return ep?.uri;
}

/**
 * Returns the user's Google Calendar events between from and to.
 * Returns [] if the user hasn't connected Google Calendar, or on any error.
 * Cached per-user / per-range for 60 seconds.
 */
export async function getGoogleCalendarEvents(
  userId: string,
  from: Date,
  to: Date,
): Promise<GoogleCalendarEvent[]> {
  const key = cacheKey(userId, from, to);
  const hit = cache.get(key);
  if (hit && Date.now() - hit.fetchedAt < CACHE_TTL_MS) return hit.events;

  const token = await getValidGoogleToken(userId);
  if (!token) {
    cache.set(key, { fetchedAt: Date.now(), events: [] });
    return [];
  }

  const out: GoogleCalendarEvent[] = [];
  let pageToken: string | undefined;
  try {
    do {
      const url = new URL(`${API_BASE}/calendars/primary/events`);
      url.searchParams.set('timeMin', from.toISOString());
      url.searchParams.set('timeMax', to.toISOString());
      url.searchParams.set('singleEvents', 'true');
      url.searchParams.set('orderBy', 'startTime');
      url.searchParams.set('maxResults', '250');
      if (pageToken) url.searchParams.set('pageToken', pageToken);

      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) {
        console.error('[google-calendar] events fetch failed:', res.status, await res.text());
        break;
      }
      const data: GoogleEventsResponse = await res.json();
      for (const ev of data.items ?? []) {
        if (ev.status === 'cancelled') continue;
        const s = parseGoogleDate(ev.start);
        const e = parseGoogleDate(ev.end);
        if (!s || !e) continue;
        out.push({
          id: ev.id,
          title: ev.summary?.trim() || '(no title)',
          start: s.date,
          end: e.date,
          allDay: s.allDay,
          location: ev.location,
          description: ev.description,
          meetingUrl: pickMeetingUrl(ev),
          htmlLink: ev.htmlLink,
        });
      }
      pageToken = data.nextPageToken;
    } while (pageToken);
  } catch (err) {
    console.error('[google-calendar] error:', err);
  }

  cache.set(key, { fetchedAt: Date.now(), events: out });
  return out;
}

/** Manually drop the cache for a user — call after disconnect. */
export function invalidateGoogleCalendarCache(userId: string) {
  for (const k of cache.keys()) {
    if (k.startsWith(`${userId}::`)) cache.delete(k);
  }
}
