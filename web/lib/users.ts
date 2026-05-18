import { ObjectId } from 'mongodb';
import clientPromise from './mongodb';

const DB_NAME = 'elevaite';
const COLLECTION = 'users';

export type AppearancePrefs = {
  theme: 'light' | 'dark' | 'system';
  density: 'compact' | 'regular' | 'comfy';
  accent: string; // hex color
  chipStyle: 'fill' | 'tinted' | 'outline';
  weekStart: 'mon' | 'sun' | 'sat';
  timeFormat: '12' | '24';
};

export const DEFAULT_APPEARANCE: AppearancePrefs = {
  theme: 'light',
  density: 'regular',
  accent: '#D97757',
  chipStyle: 'tinted',
  weekStart: 'mon',
  timeFormat: '24',
};

export type NotificationPrefs = {
  // Channels (where to reach you) — only `inbox` works today; others are placeholders
  desktop: boolean;
  email: boolean;
  mobile: boolean;
  sms: boolean;
  // Event reminders
  reminders: boolean;
  reminderLeadMin: number; // 1 | 5 | 10 | 15 | 30
  digest: boolean;
  // What gets fired into your inbox when others do things
  invites: boolean;
  rsvp: boolean;
  cancel: boolean;
  reschedule: boolean;
  bookings: boolean; // someone books one of your scheduling links
  // Integrations
  slack: boolean;
  linear: boolean;
};

export const DEFAULT_PREFS: NotificationPrefs = {
  desktop: true,
  email: true,
  mobile: true,
  sms: false,
  reminders: true,
  reminderLeadMin: 10,
  digest: true,
  invites: true,
  rsvp: true,
  cancel: true,
  reschedule: true,
  bookings: true,
  slack: false,
  linear: false,
};

export type UserRecord = {
  _id: ObjectId;
  name?: string;        // from NextAuth (Google) — first/last name
  email?: string;       // from NextAuth — read-only
  image?: string;       // from NextAuth — read-only
  displayName?: string; // user-set
  bio?: string;
  handle?: string;      // lowercase, alphanumeric + dash, unique
  timezone?: string;    // IANA, e.g. "America/Los_Angeles"
  notificationPrefs?: Partial<NotificationPrefs>;
  appearancePrefs?: Partial<AppearancePrefs>;
  updatedAt?: Date;
};

export type UserProfileDTO = {
  id: string;
  email: string;
  image?: string;
  name: string;           // resolved: displayName || name || ''
  displayName?: string;
  bio?: string;
  handle: string;         // resolved: handle || derived from email
  timezone?: string;
  updatedAt?: string;
};

export function deriveHandle(email?: string, name?: string): string {
  const base = (email?.split('@')[0] ?? name ?? 'user')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return base || 'user';
}

function toDTO(u: UserRecord): UserProfileDTO {
  return {
    id: u._id.toHexString(),
    email: u.email ?? '',
    image: u.image,
    name: u.displayName ?? u.name ?? '',
    displayName: u.displayName,
    bio: u.bio,
    handle: u.handle ?? deriveHandle(u.email, u.name),
    timezone: u.timezone,
    updatedAt: u.updatedAt?.toISOString(),
  };
}

async function col() {
  const client = await clientPromise;
  return client.db(DB_NAME).collection<UserRecord>(COLLECTION);
}

export async function getUserById(id: string): Promise<UserRecord | null> {
  if (!ObjectId.isValid(id)) return null;
  const c = await col();
  return (await c.findOne({ _id: new ObjectId(id) })) as UserRecord | null;
}

/** Get a user's effective notification prefs, with defaults filled in. */
export async function getNotificationPrefs(id: string): Promise<NotificationPrefs> {
  const u = await getUserById(id);
  return { ...DEFAULT_PREFS, ...(u?.notificationPrefs ?? {}) };
}

export async function getAppearancePrefs(id: string): Promise<AppearancePrefs> {
  const u = await getUserById(id);
  return { ...DEFAULT_APPEARANCE, ...(u?.appearancePrefs ?? {}) };
}

export async function updateAppearancePrefs(
  id: string,
  patch: Partial<AppearancePrefs>,
): Promise<AppearancePrefs | null> {
  if (!ObjectId.isValid(id)) return null;
  const c = await col();
  const setOps: Record<string, unknown> = { updatedAt: new Date() };
  for (const [k, v] of Object.entries(patch)) {
    if (v !== undefined) setOps[`appearancePrefs.${k}`] = v;
  }
  await c.updateOne({ _id: new ObjectId(id) }, { $set: setOps });
  return getAppearancePrefs(id);
}

export async function updateNotificationPrefs(
  id: string,
  patch: Partial<NotificationPrefs>,
): Promise<NotificationPrefs | null> {
  if (!ObjectId.isValid(id)) return null;
  const c = await col();
  // Build $set with notificationPrefs.<key> = value to avoid clobbering other prefs
  const setOps: Record<string, unknown> = { updatedAt: new Date() };
  for (const [k, v] of Object.entries(patch)) {
    if (v !== undefined) setOps[`notificationPrefs.${k}`] = v;
  }
  await c.updateOne({ _id: new ObjectId(id) }, { $set: setOps });
  return getNotificationPrefs(id);
}

export async function getProfile(id: string): Promise<UserProfileDTO | null> {
  const u = await getUserById(id);
  return u ? toDTO(u) : null;
}

export type UpdateProfileInput = {
  displayName?: string;
  bio?: string;
  handle?: string;
  timezone?: string;
};

export type UpdateProfileResult =
  | { ok: true; profile: UserProfileDTO }
  | { ok: false; error: 'handle_taken' | 'invalid_handle' | 'invalid_bio' | 'not_found' };

const HANDLE_RE = /^[a-z0-9](?:[a-z0-9-]{1,28}[a-z0-9])?$/;
const RESERVED_HANDLES = new Set([
  'admin', 'api', 'app', 'book', 'booked', 'calendar', 'home', 'inbox', 'me',
  'settings', 'scheduling', 'sign-in', 'sign-out', 'signed-out', 'login', 'logout',
  'support', 'help', 'about', 'pricing', 'privacy', 'terms', 'security', 'status',
  'changelog', 'blog', 'careers', 'press', 'contact', 'api-docs', 'pages',
  'oauth-callback', 'verify-email', 'forgot-password', 'reset-password',
  'onboarding', 'invite', 'checkout', 'empty', 'find-time', 'recurring', 'search',
  'timezones', 'integrations', 'mobile-preview', 'reschedule',
]);

export async function updateProfile(id: string, input: UpdateProfileInput): Promise<UpdateProfileResult> {
  if (!ObjectId.isValid(id)) return { ok: false, error: 'not_found' };
  const c = await col();

  const patch: Partial<UserRecord> = { updatedAt: new Date() };

  if (typeof input.displayName === 'string') {
    patch.displayName = input.displayName.trim().slice(0, 80);
  }
  if (typeof input.bio === 'string') {
    const bio = input.bio.trim();
    if (bio.length > 280) return { ok: false, error: 'invalid_bio' };
    patch.bio = bio;
  }
  if (typeof input.timezone === 'string' && input.timezone) {
    patch.timezone = input.timezone.slice(0, 64);
  }
  if (typeof input.handle === 'string') {
    const h = input.handle.trim().toLowerCase();
    if (!HANDLE_RE.test(h) || RESERVED_HANDLES.has(h)) {
      return { ok: false, error: 'invalid_handle' };
    }
    const conflict = await c.findOne({ handle: h, _id: { $ne: new ObjectId(id) } });
    if (conflict) return { ok: false, error: 'handle_taken' };
    patch.handle = h;
  }

  const res = await c.findOneAndUpdate(
    { _id: new ObjectId(id) },
    { $set: patch },
    { returnDocument: 'after' },
  );
  if (!res) return { ok: false, error: 'not_found' };
  return { ok: true, profile: toDTO(res as UserRecord) };
}
