import { getIntegration, saveTokens } from '@/lib/integrations';

const TOKEN_URL = 'https://zoom.us/oauth/token';
const API_BASE = 'https://api.zoom.us/v2';

type ZoomTokenResponse = {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
  scope: string;
};

async function refreshAccessToken(userId: string, refreshToken: string): Promise<string | null> {
  const clientId = process.env.ZOOM_CLIENT_ID;
  const clientSecret = process.env.ZOOM_CLIENT_SECRET;
  if (!clientId || !clientSecret) return null;
  const body = new URLSearchParams({ grant_type: 'refresh_token', refresh_token: refreshToken });
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: {
      Authorization: 'Basic ' + Buffer.from(`${clientId}:${clientSecret}`).toString('base64'),
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body,
  });
  if (!res.ok) return null;
  const data: ZoomTokenResponse = await res.json();
  await saveTokens({
    userId,
    provider: 'zoom',
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresIn: data.expires_in,
    scope: data.scope,
  });
  return data.access_token;
}

async function getValidAccessToken(userId: string): Promise<string | null> {
  const integration = await getIntegration(userId, 'zoom');
  if (!integration) return null;
  // Refresh if expired or expiring within 60 seconds
  if (integration.expiresAt && integration.expiresAt.getTime() - Date.now() < 60_000) {
    if (!integration.refreshToken) return null;
    return refreshAccessToken(userId, integration.refreshToken);
  }
  return integration.accessToken;
}

export type ZoomMeeting = {
  joinUrl: string;
  startUrl?: string;
  meetingId: number | string;
  password?: string;
};

/**
 * Create a Zoom meeting on the user's account.
 * Returns null if Zoom isn't connected or the API errors.
 */
export async function createZoomMeeting(
  hostUserId: string,
  args: { topic: string; start: Date; durationMin: number; agenda?: string },
): Promise<ZoomMeeting | null> {
  const token = await getValidAccessToken(hostUserId);
  if (!token) return null;
  try {
    const res = await fetch(`${API_BASE}/users/me/meetings`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        topic: args.topic.slice(0, 200),
        type: 2, // scheduled meeting
        start_time: args.start.toISOString(),
        duration: args.durationMin,
        timezone: 'UTC',
        agenda: args.agenda?.slice(0, 2000),
        settings: {
          host_video: true,
          participant_video: true,
          join_before_host: true,
          mute_upon_entry: true,
          waiting_room: false,
        },
      }),
    });
    if (!res.ok) {
      console.error('[zoom] create meeting failed:', res.status, await res.text());
      return null;
    }
    const data = await res.json();
    return {
      joinUrl: data.join_url,
      startUrl: data.start_url,
      meetingId: data.id,
      password: data.password,
    };
  } catch (err) {
    console.error('[zoom] error creating meeting:', err);
    return null;
  }
}

/** Exchange an OAuth code for tokens + persist. Returns true on success. */
export async function exchangeZoomCode(args: { userId: string; code: string; redirectUri: string }): Promise<boolean> {
  const clientId = process.env.ZOOM_CLIENT_ID;
  const clientSecret = process.env.ZOOM_CLIENT_SECRET;
  if (!clientId || !clientSecret) return false;
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code: args.code,
    redirect_uri: args.redirectUri,
  });
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: {
      Authorization: 'Basic ' + Buffer.from(`${clientId}:${clientSecret}`).toString('base64'),
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body,
  });
  if (!res.ok) {
    console.error('[zoom] token exchange failed:', res.status, await res.text());
    return false;
  }
  const data: ZoomTokenResponse = await res.json();
  // Fetch the user's Zoom profile for accountInfo
  let accountInfo: { id?: string; email?: string; name?: string } | undefined;
  try {
    const me = await fetch(`${API_BASE}/users/me`, {
      headers: { Authorization: `Bearer ${data.access_token}` },
    });
    if (me.ok) {
      const u = await me.json();
      accountInfo = {
        id: u.id,
        email: u.email,
        name: [u.first_name, u.last_name].filter(Boolean).join(' '),
      };
    }
  } catch {
    /* non-fatal */
  }
  await saveTokens({
    userId: args.userId,
    provider: 'zoom',
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresIn: data.expires_in,
    scope: data.scope,
    accountInfo,
  });
  return true;
}
