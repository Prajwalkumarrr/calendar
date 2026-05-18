import { ObjectId } from 'mongodb';
import clientPromise from './mongodb';

const DB_NAME = 'elevaite';
const COLLECTION = 'users';

export type UserRecord = {
  _id: ObjectId;
  name?: string;        // from NextAuth (Google) — first/last name
  email?: string;       // from NextAuth — read-only
  image?: string;       // from NextAuth — read-only
  displayName?: string; // user-set
  bio?: string;
  handle?: string;      // lowercase, alphanumeric + dash, unique
  timezone?: string;    // IANA, e.g. "America/Los_Angeles"
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
