import { getIntegration, saveTokens } from '@/lib/integrations';

const TOKEN_URL = 'https://login.microsoftonline.com/common/oauth2/v2.0/token';
const GRAPH_BASE = 'https://graph.microsoft.com/v1.0';

type MSTokenResponse = {
  access_token: string;
  refresh_token?: string;
  token_type: string;
  expires_in: number;
  scope: string;
};

type GraphEvent = {
  id: string;
  subject?: string;
  bodyPreview?: string;
  location?: { displayName?: string };
  start?: { dateTime?: string; timeZone?: string };
  end?: { dateTime?: string; timeZone?: string };
  isAllDay?: boolean;
  isCancelled?: boolean;
  onlineMeetingUrl?: string;
  onlineMeeting?: { joinUrl?: string };
  webLink?: string;
};

type GraphEventsResponse = {
  value?: GraphEvent[];
  '@odata.nextLink'?: string;
};

async function refreshOutlookToken(userId: string, refreshToken: string): Promise<string | null> {
  const clientId = process.env.MS_CLIENT_ID;
  const clientSecret = process.env.MS_CLIENT_SECRET;
  if (!clientId || !clientSecret) return null;

  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
    client_id: clientId,
    client_secret: clientSecret,
    scope: 'https://graph.microsoft.com/Calendars.ReadWrite offline_access',
  });

  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  if (!res.ok) {
    console.error('[outlook] refresh failed:', res.status, await res.text());
    return null;
  }
  const data: MSTokenResponse = await res.json();
  await saveTokens({
    userId,
    provider: 'outlook',
    accessToken: data.access_token,
    refreshToken: data.refresh_token ?? refreshToken,
    expiresIn: data.expires_in,
    scope: data.scope,
  });
  return data.access_token;
}

async function getValidOutlookToken(userId: string): Promise<string | null> {
  const integration = await getIntegration(userId, 'outlook');
  if (!integration) return null;
  if (integration.expiresAt && integration.expiresAt.getTime() - Date.now() < 60_000) {
    if (!integration.refreshToken) return null;
    return refreshOutlookToken(userId, integration.refreshToken);
  }
  return integration.accessToken;
}

export async function exchangeOutlookCode(args: {
  userId: string;
  code: string;
  redirectUri: string;
}): Promise<boolean> {
  const clientId = process.env.MS_CLIENT_ID;
  const clientSecret = process.env.MS_CLIENT_SECRET;
  if (!clientId || !clientSecret) return false;

  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code: args.code,
    redirect_uri: args.redirectUri,
    client_id: clientId,
    client_secret: clientSecret,
    scope: 'https://graph.microsoft.com/Calendars.ReadWrite offline_access',
  });

  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  if (!res.ok) {
    console.error('[outlook] token exchange failed:', res.status, await res.text());
    return false;
  }
  const data: MSTokenResponse = await res.json();

  // Fetch user profile for accountInfo
  let accountInfo: { id?: string; email?: string; name?: string } | undefined;
  try {
    const me = await fetch(`${GRAPH_BASE}/me`, {
      headers: { Authorization: `Bearer ${data.access_token}` },
    });
    if (me.ok) {
      const profile = await me.json();
      accountInfo = {
        id: profile.id,
        email: profile.mail ?? profile.userPrincipalName,
        name: profile.displayName,
      };
    }
  } catch { /* non-fatal */ }

  await saveTokens({
    userId: args.userId,
    provider: 'outlook',
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresIn: data.expires_in,
    scope: data.scope,
    accountInfo,
  });
  return true;
}

// ── Read events ──────────────────────────────────────────────────────

export type OutlookCalendarEvent = {
  id: string;
  title: string;
  start: Date;
  end: Date;
  allDay: boolean;
  location?: string;
  description?: string;
  meetingUrl?: string;
  webLink?: string;
};

type CacheEntry = { fetchedAt: number; events: OutlookCalendarEvent[] };
const CACHE_TTL_MS = 60_000;
const cache = new Map<string, CacheEntry>();

function cacheKey(userId: string, from: Date, to: Date) {
  return `outlook::${userId}::${from.getTime()}::${to.getTime()}`;
}

function parseGraphDate(dt?: string): Date | null {
  if (!dt) return null;
  // Graph returns local time without Z — treat as UTC for simplicity
  const d = new Date(dt.endsWith('Z') ? dt : dt + 'Z');
  return isNaN(d.getTime()) ? null : d;
}

export async function getOutlookCalendarEvents(
  userId: string,
  from: Date,
  to: Date,
): Promise<OutlookCalendarEvent[]> {
  const key = cacheKey(userId, from, to);
  const hit = cache.get(key);
  if (hit && Date.now() - hit.fetchedAt < CACHE_TTL_MS) return hit.events;

  const token = await getValidOutlookToken(userId);
  if (!token) {
    cache.set(key, { fetchedAt: Date.now(), events: [] });
    return [];
  }

  const out: OutlookCalendarEvent[] = [];
  let nextLink: string | undefined;

  try {
    const baseUrl = new URL(`${GRAPH_BASE}/me/calendarView`);
    baseUrl.searchParams.set('startDateTime', from.toISOString());
    baseUrl.searchParams.set('endDateTime', to.toISOString());
    baseUrl.searchParams.set('$select', 'id,subject,bodyPreview,location,start,end,isAllDay,isCancelled,onlineMeetingUrl,onlineMeeting,webLink');
    baseUrl.searchParams.set('$top', '250');

    let url: string = baseUrl.toString();

    do {
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}`, Prefer: 'outlook.timezone="UTC"' },
      });
      if (!res.ok) {
        console.error('[outlook] events fetch failed:', res.status, await res.text());
        break;
      }
      const data: GraphEventsResponse = await res.json();
      for (const ev of data.value ?? []) {
        if (ev.isCancelled) continue;
        const start = parseGraphDate(ev.start?.dateTime);
        const end = parseGraphDate(ev.end?.dateTime);
        if (!start || !end) continue;
        out.push({
          id: ev.id,
          title: ev.subject?.trim() || '(no title)',
          start,
          end,
          allDay: ev.isAllDay ?? false,
          location: ev.location?.displayName || undefined,
          description: ev.bodyPreview || undefined,
          meetingUrl: ev.onlineMeeting?.joinUrl ?? ev.onlineMeetingUrl ?? undefined,
          webLink: ev.webLink,
        });
      }
      nextLink = data['@odata.nextLink'];
      url = nextLink ?? '';
    } while (nextLink);
  } catch (err) {
    console.error('[outlook] error:', err);
  }

  cache.set(key, { fetchedAt: Date.now(), events: out });
  return out;
}

export function invalidateOutlookCache(userId: string) {
  for (const k of cache.keys()) {
    if (k.startsWith(`outlook::${userId}::`)) cache.delete(k);
  }
}

// ── Write events ─────────────────────────────────────────────────────

type GraphEventInput = {
  subject: string;
  start: { dateTime: string; timeZone: string };
  end: { dateTime: string; timeZone: string };
  location?: { displayName: string };
  body?: { contentType: string; content: string };
};

function toGraphInput(args: {
  title: string;
  start: Date;
  end: Date;
  location?: string;
  description?: string;
}): GraphEventInput {
  return {
    subject: args.title,
    start: { dateTime: args.start.toISOString(), timeZone: 'UTC' },
    end: { dateTime: args.end.toISOString(), timeZone: 'UTC' },
    ...(args.location ? { location: { displayName: args.location } } : {}),
    ...(args.description ? { body: { contentType: 'text', content: args.description } } : {}),
  };
}

export async function createOutlookEvent(
  userId: string,
  args: { title: string; start: Date; end: Date; location?: string; description?: string },
): Promise<string | null> {
  const token = await getValidOutlookToken(userId);
  if (!token) return null;

  const res = await fetch(`${GRAPH_BASE}/me/events`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(toGraphInput(args)),
  });
  if (!res.ok) {
    console.error('[outlook] createEvent failed:', res.status, await res.text());
    return null;
  }
  const data = await res.json();
  invalidateOutlookCache(userId);
  return data.id ?? null;
}

export async function updateOutlookEvent(
  userId: string,
  outlookEventId: string,
  args: { title: string; start: Date; end: Date; location?: string; description?: string },
): Promise<boolean> {
  const token = await getValidOutlookToken(userId);
  if (!token) return false;

  const res = await fetch(`${GRAPH_BASE}/me/events/${outlookEventId}`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(toGraphInput(args)),
  });
  if (!res.ok) {
    console.error('[outlook] updateEvent failed:', res.status, await res.text());
    return false;
  }
  invalidateOutlookCache(userId);
  return true;
}

export async function deleteOutlookEvent(
  userId: string,
  outlookEventId: string,
): Promise<boolean> {
  const token = await getValidOutlookToken(userId);
  if (!token) return false;

  const res = await fetch(`${GRAPH_BASE}/me/events/${outlookEventId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok && res.status !== 404) {
    console.error('[outlook] deleteEvent failed:', res.status);
    return false;
  }
  invalidateOutlookCache(userId);
  return true;
}
