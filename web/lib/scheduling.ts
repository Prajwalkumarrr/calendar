import { ObjectId } from 'mongodb';
import clientPromise from './mongodb';
import { createEvent } from './events';

const DB_NAME = 'elevaite';

// ── Types ────────────────────────────────────────────────────────────

export type WorkingHourRange = { start: string; end: string }; // "HH:MM" 24h

export type SchedulingLinkDoc = {
  _id?: ObjectId;
  ownerId: string;
  title: string;
  slug: string; // globally unique, URL-safe
  durationMin: number;
  description?: string;
  // Map weekday (0=Sun…6=Sat) → array of working ranges that day
  workingHours: Record<string, WorkingHourRange[]>;
  bufferMin: number;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export type SchedulingLinkDTO = Omit<SchedulingLinkDoc, '_id' | 'createdAt' | 'updatedAt'> & {
  id: string;
  createdAt: string;
};

export type BookingDoc = {
  _id?: ObjectId;
  linkId: ObjectId;
  ownerId: string;
  eventId?: ObjectId;
  inviteeName: string;
  inviteeEmail: string;
  start: Date;
  end: Date;
  note?: string;
  status: 'confirmed' | 'cancelled';
  createdAt: Date;
};

export type BookingDTO = {
  id: string;
  linkId: string;
  ownerId: string;
  inviteeName: string;
  inviteeEmail: string;
  start: string;
  end: string;
  note?: string;
  status: 'confirmed' | 'cancelled';
  link?: { title: string; slug: string; durationMin: number };
};

// ── Helpers ──────────────────────────────────────────────────────────

function linkToDTO(doc: SchedulingLinkDoc): SchedulingLinkDTO {
  return {
    id: doc._id!.toHexString(),
    ownerId: doc.ownerId,
    title: doc.title,
    slug: doc.slug,
    durationMin: doc.durationMin,
    description: doc.description,
    workingHours: doc.workingHours,
    bufferMin: doc.bufferMin,
    active: doc.active,
    createdAt: doc.createdAt.toISOString(),
  };
}

function bookingToDTO(doc: BookingDoc, link?: SchedulingLinkDoc): BookingDTO {
  return {
    id: doc._id!.toHexString(),
    linkId: doc.linkId.toHexString(),
    ownerId: doc.ownerId,
    inviteeName: doc.inviteeName,
    inviteeEmail: doc.inviteeEmail,
    start: doc.start.toISOString(),
    end: doc.end.toISOString(),
    note: doc.note,
    status: doc.status,
    link: link
      ? { title: link.title, slug: link.slug, durationMin: link.durationMin }
      : undefined,
  };
}

async function linksCol() {
  const client = await clientPromise;
  return client.db(DB_NAME).collection<SchedulingLinkDoc>('schedulingLinks');
}

async function bookingsCol() {
  const client = await clientPromise;
  return client.db(DB_NAME).collection<BookingDoc>('bookings');
}

export function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48) || `link-${Math.random().toString(36).slice(2, 7)}`;
}

export const DEFAULT_WORKING_HOURS: SchedulingLinkDoc['workingHours'] = {
  '0': [],
  '1': [{ start: '09:00', end: '17:00' }],
  '2': [{ start: '09:00', end: '17:00' }],
  '3': [{ start: '09:00', end: '17:00' }],
  '4': [{ start: '09:00', end: '17:00' }],
  '5': [{ start: '09:00', end: '17:00' }],
  '6': [],
};

// ── CRUD: links ──────────────────────────────────────────────────────

export async function listLinks(ownerId: string): Promise<SchedulingLinkDTO[]> {
  const c = await linksCol();
  const docs = await c.find({ ownerId }).sort({ createdAt: -1 }).toArray();
  return docs.map(linkToDTO);
}

export type CreateLinkInput = {
  ownerId: string;
  title: string;
  slug?: string;
  durationMin: number;
  description?: string;
  workingHours?: SchedulingLinkDoc['workingHours'];
  bufferMin?: number;
};

export async function createLink(input: CreateLinkInput): Promise<SchedulingLinkDTO | { error: string }> {
  const c = await linksCol();
  const base = input.slug ? slugify(input.slug) : slugify(input.title);
  // ensure uniqueness — append -2, -3, ... if taken
  let slug = base;
  for (let i = 2; i < 100; i++) {
    const exists = await c.findOne({ slug });
    if (!exists) break;
    slug = `${base}-${i}`;
  }
  const now = new Date();
  const doc: SchedulingLinkDoc = {
    ownerId: input.ownerId,
    title: input.title.trim() || 'Untitled link',
    slug,
    durationMin: input.durationMin,
    description: input.description,
    workingHours: input.workingHours ?? DEFAULT_WORKING_HOURS,
    bufferMin: input.bufferMin ?? 0,
    active: true,
    createdAt: now,
    updatedAt: now,
  };
  const res = await c.insertOne(doc);
  return linkToDTO({ ...doc, _id: res.insertedId });
}

export async function deleteLink(ownerId: string, id: string): Promise<boolean> {
  if (!ObjectId.isValid(id)) return false;
  const c = await linksCol();
  const res = await c.deleteOne({ _id: new ObjectId(id), ownerId });
  return res.deletedCount === 1;
}

export async function updateLink(
  ownerId: string,
  id: string,
  patch: Partial<Pick<SchedulingLinkDoc, 'title' | 'description' | 'durationMin' | 'workingHours' | 'bufferMin' | 'active'>>,
): Promise<SchedulingLinkDTO | null> {
  if (!ObjectId.isValid(id)) return null;
  const c = await linksCol();
  const res = await c.findOneAndUpdate(
    { _id: new ObjectId(id), ownerId },
    { $set: { ...patch, updatedAt: new Date() } },
    { returnDocument: 'after' },
  );
  return res ? linkToDTO(res as SchedulingLinkDoc) : null;
}

export async function getLinkBySlug(slug: string): Promise<SchedulingLinkDoc | null> {
  const c = await linksCol();
  return c.findOne({ slug, active: true });
}

// ── Slot generation ──────────────────────────────────────────────────

function makeLocalTime(base: Date, hhmm: string): Date {
  const [h, m] = hhmm.split(':').map(Number);
  const d = new Date(base);
  d.setHours(h, m, 0, 0);
  return d;
}

/**
 * Compute open slots for a given date and link.
 * busyRanges should include any pre-existing events for the host that day.
 */
export function generateSlots(
  link: SchedulingLinkDoc,
  date: Date,
  busyRanges: { start: Date; end: Date }[],
): { start: string; end: string }[] {
  const weekday = String(date.getDay());
  const ranges = link.workingHours[weekday] ?? [];
  const out: { start: string; end: string }[] = [];
  const step = (link.durationMin + link.bufferMin) * 60_000;
  for (const r of ranges) {
    let cursor = makeLocalTime(date, r.start);
    const dayEnd = makeLocalTime(date, r.end);
    while (true) {
      const slotEnd = new Date(cursor.getTime() + link.durationMin * 60_000);
      if (slotEnd > dayEnd) break;
      // skip slots in the past
      if (slotEnd > new Date()) {
        const overlaps = busyRanges.some(
          (b) => slotEnd > b.start && cursor < b.end,
        );
        if (!overlaps) {
          out.push({ start: cursor.toISOString(), end: slotEnd.toISOString() });
        }
      }
      cursor = new Date(cursor.getTime() + step);
    }
  }
  return out;
}

// ── Bookings ─────────────────────────────────────────────────────────

export type CreateBookingInput = {
  link: SchedulingLinkDoc;
  inviteeName: string;
  inviteeEmail: string;
  start: Date;
  end: Date;
  note?: string;
};

export async function createBooking(input: CreateBookingInput): Promise<BookingDTO> {
  const now = new Date();
  const event = await createEvent({
    ownerId: input.link.ownerId,
    title: `${input.link.title} · ${input.inviteeName}`,
    start: input.start,
    end: input.end,
    color: 'coral',
    description: input.note,
  });
  const c = await bookingsCol();
  const doc: BookingDoc = {
    linkId: input.link._id!,
    ownerId: input.link.ownerId,
    eventId: new ObjectId(event.id),
    inviteeName: input.inviteeName.trim(),
    inviteeEmail: input.inviteeEmail.trim().toLowerCase(),
    start: input.start,
    end: input.end,
    note: input.note,
    status: 'confirmed',
    createdAt: now,
  };
  const res = await c.insertOne(doc);
  return bookingToDTO({ ...doc, _id: res.insertedId }, input.link);
}

export async function getBooking(id: string): Promise<BookingDTO | null> {
  if (!ObjectId.isValid(id)) return null;
  const c = await bookingsCol();
  const doc = await c.findOne({ _id: new ObjectId(id) });
  if (!doc) return null;
  const linksC = await linksCol();
  const link = await linksC.findOne({ _id: doc.linkId });
  return bookingToDTO(doc, link ?? undefined);
}

export const DURATION_OPTIONS = [15, 30, 45, 60, 90];
export const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
