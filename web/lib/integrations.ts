import { ObjectId } from 'mongodb';
import clientPromise from './mongodb';

const DB_NAME = 'elevaite';
const COLLECTION = 'integrations';

export type ProviderId = 'zoom' | 'slack' | 'notion' | 'icloud' | 'outlook' | 'google-meet' | 'google-calendar';

export type IntegrationDoc = {
  _id?: ObjectId;
  userId: string;
  provider: ProviderId;
  accessToken: string;
  refreshToken?: string;
  expiresAt?: Date;
  scope?: string;
  accountInfo?: {
    id?: string;
    email?: string;
    name?: string;
    workspace?: string;
  };
  connectedAt: Date;
  updatedAt: Date;
};

export type IntegrationDTO = {
  provider: ProviderId;
  accountInfo?: IntegrationDoc['accountInfo'];
  connectedAt: string;
  expiresAt?: string;
};

export type ProviderMeta = {
  id: ProviderId;
  name: string;
  category: 'conferencing' | 'communication' | 'productivity' | 'calendar';
  description: string;
  status: 'available' | 'beta' | 'coming-soon' | 'needs-credentials';
  envHint?: string;          // human-readable list of env vars needed
  authorizeUrl?: string;     // OAuth authorize endpoint
  tokenUrl?: string;         // OAuth token exchange endpoint
  scope?: string;            // space-separated OAuth scopes
  envClientId?: string;      // override env var name for client ID
  envClientSecret?: string;  // override env var name for client secret
  iconBg?: string;
  iconText?: string;
};

function envSet(...names: string[]): boolean {
  return names.every((n) => !!process.env[n]);
}

export function getProviders(): ProviderMeta[] {
  return [
    {
      id: 'zoom',
      name: 'Zoom',
      category: 'conferencing',
      description: 'Auto-create Zoom meeting links when an invitee books you.',
      status: envSet('ZOOM_CLIENT_ID', 'ZOOM_CLIENT_SECRET') ? 'available' : 'needs-credentials',
      envHint: 'ZOOM_CLIENT_ID + ZOOM_CLIENT_SECRET (create at https://marketplace.zoom.us)',
      authorizeUrl: 'https://zoom.us/oauth/authorize',
      tokenUrl: 'https://zoom.us/oauth/token',
      iconBg: '#2D8CFF',
      iconText: 'Z',
    },
    {
      id: 'slack',
      name: 'Slack',
      category: 'communication',
      description: 'Post to a channel before standups, get notified when bookings come in.',
      status: envSet('SLACK_CLIENT_ID', 'SLACK_CLIENT_SECRET') ? 'available' : 'needs-credentials',
      envHint: 'SLACK_CLIENT_ID + SLACK_CLIENT_SECRET (create at https://api.slack.com/apps)',
      authorizeUrl: 'https://slack.com/oauth/v2/authorize',
      tokenUrl: 'https://slack.com/api/oauth.v2.access',
      scope: 'chat:write,channels:read',
      iconBg: '#4A154B',
      iconText: 'S',
    },
    {
      id: 'notion',
      name: 'Notion',
      category: 'productivity',
      description: 'Mirror your calendar to a Notion database. Two-way edits coming later.',
      status: envSet('NOTION_CLIENT_ID', 'NOTION_CLIENT_SECRET') ? 'available' : 'needs-credentials',
      envHint: 'NOTION_CLIENT_ID + NOTION_CLIENT_SECRET (create at https://www.notion.so/my-integrations)',
      authorizeUrl: 'https://api.notion.com/v1/oauth/authorize',
      tokenUrl: 'https://api.notion.com/v1/oauth/token',
      iconBg: '#000000',
      iconText: 'N',
    },
    {
      id: 'google-meet',
      name: 'Google Meet',
      category: 'conferencing',
      description: 'Auto-attached when your booking link is set to Meet. No setup needed once you sign in with Google.',
      status: 'beta',
      iconBg: '#00832D',
      iconText: 'M',
    },
    {
      id: 'google-calendar',
      name: 'Google Calendar',
      category: 'calendar',
      description: 'Show your Google Calendar events in ElevAIte. Read-only; counted as busy when finding times.',
      status: envSet('GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET') ? 'available' : 'needs-credentials',
      envHint: 'Reuses GOOGLE_CLIENT_ID + GOOGLE_CLIENT_SECRET (the same OAuth app as sign-in). Add the redirect URI /api/integrations/google-calendar/callback in Google Cloud Console.',
      authorizeUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
      tokenUrl: 'https://oauth2.googleapis.com/token',
      scope: 'https://www.googleapis.com/auth/calendar.readonly',
      envClientId: 'GOOGLE_CLIENT_ID',
      envClientSecret: 'GOOGLE_CLIENT_SECRET',
      iconBg: '#4285F4',
      iconText: 'G',
    },
    {
      id: 'icloud',
      name: 'Apple iCloud',
      category: 'calendar',
      description: 'Two-way sync with iCloud Calendar via CalDAV. App-specific password required.',
      status: 'coming-soon',
      envHint: 'CalDAV is a substantial implementation (no OAuth). Tracking in Phase 10.4.',
      iconBg: '#000000',
      iconText: '',
    },
    {
      id: 'outlook',
      name: 'Microsoft Outlook',
      category: 'calendar',
      description: 'Two-way sync with Outlook Calendar via Microsoft Graph. OAuth.',
      status: 'coming-soon',
      envHint: 'MS_CLIENT_ID + MS_CLIENT_SECRET (Microsoft Graph). Tracking in Phase 10.5.',
      iconBg: '#0078D4',
      iconText: 'O',
    },
  ];
}

export function getProvider(id: ProviderId): ProviderMeta | undefined {
  return getProviders().find((p) => p.id === id);
}

async function col() {
  const client = await clientPromise;
  return client.db(DB_NAME).collection<IntegrationDoc>(COLLECTION);
}

function toDTO(d: IntegrationDoc): IntegrationDTO {
  return {
    provider: d.provider,
    accountInfo: d.accountInfo,
    connectedAt: d.connectedAt.toISOString(),
    expiresAt: d.expiresAt?.toISOString(),
  };
}

export async function listIntegrations(userId: string): Promise<IntegrationDTO[]> {
  const c = await col();
  const docs = await c.find({ userId }).toArray();
  return docs.map(toDTO);
}

export async function getIntegration(userId: string, provider: ProviderId): Promise<IntegrationDoc | null> {
  const c = await col();
  return c.findOne({ userId, provider });
}

export type SaveTokensInput = {
  userId: string;
  provider: ProviderId;
  accessToken: string;
  refreshToken?: string;
  expiresIn?: number; // seconds
  scope?: string;
  accountInfo?: IntegrationDoc['accountInfo'];
};

export async function saveTokens(input: SaveTokensInput): Promise<IntegrationDTO> {
  const c = await col();
  const now = new Date();
  const expiresAt = input.expiresIn ? new Date(now.getTime() + input.expiresIn * 1000) : undefined;
  const doc: IntegrationDoc = {
    userId: input.userId,
    provider: input.provider,
    accessToken: input.accessToken,
    refreshToken: input.refreshToken,
    expiresAt,
    scope: input.scope,
    accountInfo: input.accountInfo,
    connectedAt: now,
    updatedAt: now,
  };
  await c.updateOne(
    { userId: input.userId, provider: input.provider },
    { $set: doc },
    { upsert: true },
  );
  return toDTO(doc);
}

export async function deleteIntegration(userId: string, provider: ProviderId): Promise<boolean> {
  const c = await col();
  const res = await c.deleteOne({ userId, provider });
  return res.deletedCount === 1;
}

// ── OAuth state (random, signed-ish via NEXTAUTH_SECRET hash) ───────

import crypto from 'crypto';

export function makeOAuthState(userId: string, provider: ProviderId): string {
  const nonce = crypto.randomBytes(12).toString('base64url');
  const secret = process.env.NEXTAUTH_SECRET ?? 'dev-secret';
  const payload = `${userId}.${provider}.${nonce}`;
  const sig = crypto.createHmac('sha256', secret).update(payload).digest('base64url').slice(0, 16);
  return `${payload}.${sig}`;
}

export function parseOAuthState(state: string): { userId: string; provider: ProviderId } | null {
  const parts = state.split('.');
  if (parts.length !== 4) return null;
  const [userId, provider, nonce, sig] = parts;
  const secret = process.env.NEXTAUTH_SECRET ?? 'dev-secret';
  const expected = crypto.createHmac('sha256', secret).update(`${userId}.${provider}.${nonce}`).digest('base64url').slice(0, 16);
  if (expected !== sig) return null;
  return { userId, provider: provider as ProviderId };
}
