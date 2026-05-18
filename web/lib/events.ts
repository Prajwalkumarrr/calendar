import { ObjectId } from 'mongodb';
import clientPromise from './mongodb';

const DB_NAME = 'elevaite';
const COLLECTION = 'events';

export type ChipColor = 'coral' | 'sand' | 'sage' | 'slate' | 'plum' | 'ochre' | 'rose' | 'stone';

export type Recurrence = {
  freq: 'daily' | 'weekly' | 'monthly' | 'yearly';
  interval: number;        // every N units; default 1
  byWeekday?: number[];    // 0=Sun..6=Sat, only used when freq='weekly'
  count?: number;          // stop after N occurrences (including base)
  until?: Date;            // stop on or before this date (inclusive)
};

export type RecurrenceDTO = Omit<Recurrence, 'until'> & {
  until?: string; // ISO
};

export type EventDoc = {
  _id?: ObjectId;
  ownerId: string;
  title: string;
  start: Date;
  end: Date;
  allDay?: boolean;
  color: ChipColor;
  location?: string;
  description?: string;
  conferencing?: { provider: 'meet' | 'zoom' | 'teams' | 'custom'; url?: string };
  recurrence?: Recurrence;
  createdAt: Date;
  updatedAt: Date;
};

export type EventDTO = Omit<EventDoc, '_id' | 'start' | 'end' | 'createdAt' | 'updatedAt' | 'recurrence'> & {
  id: string;
  start: string; // ISO
  end: string;   // ISO
  recurrence?: RecurrenceDTO;
  // Set on expanded instances of a recurring series
  seriesId?: string;       // base event id (same as `id` for the base)
  instanceIndex?: number;  // 0 = base, 1 = first repeat, ...
};

function recurrenceToDTO(r?: Recurrence): RecurrenceDTO | undefined {
  if (!r) return undefined;
  return { ...r, until: r.until?.toISOString() };
}

function toDTO(doc: EventDoc, overrideStart?: Date, overrideEnd?: Date, idx = 0): EventDTO {
  const start = overrideStart ?? doc.start;
  const end = overrideEnd ?? doc.end;
  return {
    id: idx === 0 ? doc._id!.toHexString() : `${doc._id!.toHexString()}@${idx}`,
    ownerId: doc.ownerId,
    title: doc.title,
    start: start.toISOString(),
    end: end.toISOString(),
    allDay: doc.allDay,
    color: doc.color,
    location: doc.location,
    description: doc.description,
    conferencing: doc.conferencing,
    recurrence: recurrenceToDTO(doc.recurrence),
    seriesId: doc.recurrence ? doc._id!.toHexString() : undefined,
    instanceIndex: doc.recurrence ? idx : undefined,
  };
}

async function col() {
  const client = await clientPromise;
  return client.db(DB_NAME).collection<EventDoc>(COLLECTION);
}

const MAX_INSTANCES = 730; // 2-year cap as a runaway-safety

/** Expand a (potentially recurring) event into all instances whose start∈[from,to). */
function expandToRange(doc: EventDoc, from: Date, to: Date): EventDTO[] {
  if (!doc.recurrence) {
    // Non-recurring — include if it overlaps the range
    if (doc.start < to && doc.end > from) return [toDTO(doc)];
    return [];
  }
  const r = doc.recurrence;
  const interval = Math.max(1, r.interval || 1);
  const duration = doc.end.getTime() - doc.start.getTime();
  const limitUntil = r.until ? new Date(r.until) : null;
  const limitCount = Math.min(r.count ?? MAX_INSTANCES, MAX_INSTANCES);
  const out: EventDTO[] = [];

  // Generate occurrence start times.
  const cursors: Date[] = [];

  if (r.freq === 'weekly' && r.byWeekday && r.byWeekday.length > 0) {
    // Walk from base.start day by day; emit on matching weekdays.
    // Respect interval (every N weeks): only emit if (weeksSinceBase % interval === 0).
    const baseSunday = new Date(doc.start);
    baseSunday.setHours(0, 0, 0, 0);
    baseSunday.setDate(baseSunday.getDate() - baseSunday.getDay()); // Sunday of base week
    const baseHour = doc.start.getHours();
    const baseMin = doc.start.getMinutes();
    const baseSec = doc.start.getSeconds();
    const days = new Set(r.byWeekday);
    let walker = new Date(doc.start);
    walker.setHours(0, 0, 0, 0);
    let i = 0;
    while (i < limitCount && walker < to) {
      if (limitUntil && walker > limitUntil) break;
      const weeksSinceBase = Math.floor(
        (Date.UTC(walker.getFullYear(), walker.getMonth(), walker.getDate())
        - Date.UTC(baseSunday.getFullYear(), baseSunday.getMonth(), baseSunday.getDate())) / (7 * 86_400_000),
      );
      if (weeksSinceBase % interval === 0 && days.has(walker.getDay())) {
        const slot = new Date(walker);
        slot.setHours(baseHour, baseMin, baseSec, 0);
        if (slot >= from) cursors.push(slot);
        i++;
      }
      walker.setDate(walker.getDate() + 1);
    }
  } else {
    // Daily / weekly (no byWeekday) / monthly / yearly — step by interval
    const advance = (d: Date): Date => {
      const n = new Date(d);
      if (r.freq === 'daily') n.setDate(n.getDate() + interval);
      else if (r.freq === 'weekly') n.setDate(n.getDate() + 7 * interval);
      else if (r.freq === 'monthly') n.setMonth(n.getMonth() + interval);
      else if (r.freq === 'yearly') n.setFullYear(n.getFullYear() + interval);
      return n;
    };
    let cursor = new Date(doc.start);
    let i = 0;
    while (i < limitCount && cursor < to) {
      if (limitUntil && cursor > limitUntil) break;
      if (cursor.getTime() + duration > from.getTime()) cursors.push(new Date(cursor));
      cursor = advance(cursor);
      i++;
    }
  }

  for (let idx = 0; idx < cursors.length; idx++) {
    const start = cursors[idx];
    const end = new Date(start.getTime() + duration);
    out.push(toDTO(doc, start, end, idx));
  }
  return out;
}

export async function listEventsInRange(
  ownerId: string,
  from: Date,
  to: Date,
): Promise<EventDTO[]> {
  const c = await col();
  // Pull events whose base start is before `to` AND (it's recurring OR end > from).
  const docs = await c
    .find({
      ownerId,
      start: { $lt: to },
      $or: [
        { recurrence: { $exists: true, $ne: null } },
        { end: { $gt: from } },
      ],
    })
    .sort({ start: 1 })
    .toArray();
  const out: EventDTO[] = [];
  for (const doc of docs) out.push(...expandToRange(doc as EventDoc, from, to));
  return out.sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
}

export type CreateEventInput = {
  ownerId: string;
  title: string;
  start: Date;
  end: Date;
  allDay?: boolean;
  color?: ChipColor;
  location?: string;
  description?: string;
  recurrence?: Recurrence;
};

export async function createEvent(input: CreateEventInput): Promise<EventDTO> {
  const now = new Date();
  const doc: EventDoc = {
    ownerId: input.ownerId,
    title: input.title.trim() || 'Untitled',
    start: input.start,
    end: input.end,
    allDay: input.allDay ?? false,
    color: input.color ?? 'coral',
    location: input.location,
    description: input.description,
    recurrence: input.recurrence,
    createdAt: now,
    updatedAt: now,
  };
  const c = await col();
  const res = await c.insertOne(doc);
  return toDTO({ ...doc, _id: res.insertedId });
}

export type UpdateEventInput = Partial<Omit<EventDoc, '_id' | 'ownerId' | 'createdAt' | 'updatedAt'>>;

export async function updateEvent(
  ownerId: string,
  id: string,
  patch: UpdateEventInput,
): Promise<EventDTO | null> {
  if (!ObjectId.isValid(id)) return null;
  const c = await col();
  const $set: Record<string, unknown> = { ...patch, updatedAt: new Date() };
  const $unset: Record<string, ''> = {};
  // null recurrence means "remove recurrence" — delete the field
  if ('recurrence' in patch && patch.recurrence == null) {
    delete $set.recurrence;
    $unset.recurrence = '';
  }
  const update: Record<string, unknown> = { $set };
  if (Object.keys($unset).length > 0) update.$unset = $unset;
  const res = await c.findOneAndUpdate(
    { _id: new ObjectId(id), ownerId },
    update,
    { returnDocument: 'after' },
  );
  if (!res) return null;
  return toDTO(res as EventDoc);
}

export async function deleteEvent(ownerId: string, id: string): Promise<boolean> {
  if (!ObjectId.isValid(id)) return false;
  const c = await col();
  const res = await c.deleteOne({ _id: new ObjectId(id), ownerId });
  return res.deletedCount === 1;
}

export const CHIP_COLORS: ChipColor[] = [
  'coral', 'sand', 'sage', 'slate', 'plum', 'ochre', 'rose', 'stone',
];

/** Parse a recurrence DTO from request JSON into a server-side Recurrence. */
export function parseRecurrenceInput(input: unknown): Recurrence | null | undefined {
  if (input === undefined) return undefined; // not provided — don't change
  if (input === null) return null;            // explicitly clear
  const r = input as Partial<RecurrenceDTO>;
  if (!r.freq || !['daily', 'weekly', 'monthly', 'yearly'].includes(r.freq)) return null;
  const out: Recurrence = {
    freq: r.freq,
    interval: Math.max(1, Math.min(52, Number(r.interval) || 1)),
  };
  if (Array.isArray(r.byWeekday) && r.freq === 'weekly') {
    out.byWeekday = r.byWeekday
      .map((n) => Number(n))
      .filter((n) => Number.isInteger(n) && n >= 0 && n <= 6);
  }
  if (typeof r.count === 'number' && r.count > 0) {
    out.count = Math.min(Math.floor(r.count), 1000);
  }
  if (typeof r.until === 'string') {
    const d = new Date(r.until);
    if (!Number.isNaN(+d)) out.until = d;
  }
  return out;
}
