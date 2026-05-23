import { ObjectId } from 'mongodb';
import clientPromise from './mongodb';

const DB_NAME = 'elevaite';
const COLLECTION = 'events';

export type ChipColor = 'coral' | 'sand' | 'sage' | 'slate' | 'plum' | 'ochre' | 'rose' | 'stone';

export type Recurrence = {
  freq: 'daily' | 'weekly' | 'monthly' | 'yearly';
  interval: number;
  byWeekday?: number[];
  count?: number;
  until?: Date;
};

export type RecurrenceDTO = Omit<Recurrence, 'until'> & {
  until?: string; // ISO
};

export type HiringMeta = {
  candidateId?: string;
  candidateName: string;
  role: string;
  stage: 'screen' | 'technical' | 'founder' | 'offer' | 'rejected';
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
  exdates?: Date[];
  hiringMeta?: HiringMeta;   // set when this is an interview event
  createdAt: Date;
  updatedAt: Date;
};

export type EventDTO = Omit<EventDoc, '_id' | 'start' | 'end' | 'createdAt' | 'updatedAt' | 'recurrence' | 'exdates' | 'hiringMeta'> & {
  id: string;
  start: string;
  end: string;
  recurrence?: RecurrenceDTO;
  seriesId?: string;
  instanceIndex?: number;
  originalDate?: string;
  hiringMeta?: HiringMeta;
  source?: 'google';
  readOnly?: boolean;
  externalLink?: string;
};

export type RecurringScope = 'this' | 'future' | 'all';

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
    originalDate: doc.recurrence ? start.toISOString() : undefined,
    hiringMeta: doc.hiringMeta,
  };
}

async function col() {
  const client = await clientPromise;
  return client.db(DB_NAME).collection<EventDoc>(COLLECTION);
}

const MAX_INSTANCES = 730;

/** Returns true if `date` matches any exdate (same UTC day). */
function isExcluded(date: Date, exdates?: Date[]): boolean {
  if (!exdates || exdates.length === 0) return false;
  const d = date.toISOString().slice(0, 10);
  return exdates.some((ex) => new Date(ex).toISOString().slice(0, 10) === d);
}

/** Expand a (potentially recurring) event into all instances whose start∈[from,to). */
function expandToRange(doc: EventDoc, from: Date, to: Date): EventDTO[] {
  if (!doc.recurrence) {
    if (doc.start < to && doc.end > from) return [toDTO(doc)];
    return [];
  }
  const r = doc.recurrence;
  const interval = Math.max(1, r.interval || 1);
  const duration = doc.end.getTime() - doc.start.getTime();
  const limitUntil = r.until ? new Date(r.until) : null;
  const limitCount = Math.min(r.count ?? MAX_INSTANCES, MAX_INSTANCES);
  const out: EventDTO[] = [];

  const cursors: Date[] = [];

  if (r.freq === 'weekly' && r.byWeekday && r.byWeekday.length > 0) {
    const baseSunday = new Date(doc.start);
    baseSunday.setHours(0, 0, 0, 0);
    baseSunday.setDate(baseSunday.getDate() - baseSunday.getDay());
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
        if (!isExcluded(slot, doc.exdates)) {
          if (slot >= from) cursors.push(slot);
          i++;
        } else {
          i++; // still count toward limit so exdates don't extend series indefinitely
        }
      }
      walker.setDate(walker.getDate() + 1);
    }
  } else {
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
      if (!isExcluded(cursor, doc.exdates)) {
        if (cursor.getTime() + duration > from.getTime()) cursors.push(new Date(cursor));
      }
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
  opts: { includeExternal?: boolean } = {},
): Promise<EventDTO[]> {
  const includeExternal = opts.includeExternal !== false;
  const c = await col();
  const docs = await c
    .find({
      ownerId,
      start: { $lt: to },
      $or: [
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        { recurrence: { $exists: true } as any },
        { end: { $gt: from } },
      ],
    })
    .sort({ start: 1 })
    .toArray();
  const out: EventDTO[] = [];
  for (const doc of docs) out.push(...expandToRange(doc as EventDoc, from, to));

  if (includeExternal) {
    const { getGoogleCalendarEvents } = await import('./integrations/google-calendar');
    try {
      const googleEvents = await getGoogleCalendarEvents(ownerId, from, to);
      for (const ev of googleEvents) {
        out.push({
          id: `google:${ev.id}`,
          ownerId,
          title: ev.title,
          start: ev.start.toISOString(),
          end: ev.end.toISOString(),
          allDay: ev.allDay,
          color: 'slate',
          location: ev.location,
          description: ev.description,
          conferencing: ev.meetingUrl ? { provider: 'meet', url: ev.meetingUrl } : undefined,
          source: 'google',
          readOnly: true,
          externalLink: ev.htmlLink,
        });
      }
    } catch (err) {
      console.error('[events] google merge failed:', err);
    }
  }

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
  conferencing?: EventDoc['conferencing'];
  recurrence?: Recurrence;
  hiringMeta?: HiringMeta;
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
    conferencing: input.conferencing,
    recurrence: input.recurrence,
    hiringMeta: input.hiringMeta,
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
  if ('recurrence' in patch && patch.recurrence == null) {
    delete $set.recurrence;
    $unset.recurrence = '';
  }
  const update: Record<string, unknown> = { $set };
  if (Object.keys($unset).length > 0) update.$unset = $unset;
  const res = await c.findOneAndUpdate(
    { _id: new ObjectId(id), ownerId },
    update,
    { returnDocument: 'after', includeResultMetadata: false },
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

// ─── Scoped recurring edit/delete ─────────────────────────────────────

/**
 * Edit just one occurrence: add its date to exdates, create a standalone event
 * with the edited data.
 */
export async function editThisOnly(
  ownerId: string,
  seriesId: string,
  originalDate: Date,
  patch: UpdateEventInput,
): Promise<EventDTO | null> {
  if (!ObjectId.isValid(seriesId)) return null;
  const c = await col();

  // Fetch base to get duration + existing fields
  const base = await c.findOne({ _id: new ObjectId(seriesId), ownerId });
  if (!base) return null;

  const duration = base.end.getTime() - base.start.getTime();
  const newStart = (patch.start as Date | undefined) ?? originalDate;
  const newEnd = (patch.end as Date | undefined) ?? new Date(newStart.getTime() + duration);

  // Exclude this date from the series
  await c.updateOne(
    { _id: new ObjectId(seriesId), ownerId },
    { $addToSet: { exdates: originalDate }, $set: { updatedAt: new Date() } },
  );

  // Create standalone override event (no recurrence)
  const now = new Date();
  const overrideDoc: EventDoc = {
    ownerId,
    title: (patch.title as string | undefined) ?? base.title,
    start: newStart,
    end: newEnd,
    allDay: (patch.allDay as boolean | undefined) ?? base.allDay,
    color: (patch.color as ChipColor | undefined) ?? base.color,
    location: (patch.location as string | undefined) ?? base.location,
    description: (patch.description as string | undefined) ?? base.description,
    conferencing: base.conferencing,
    createdAt: now,
    updatedAt: now,
  };
  const res = await c.insertOne(overrideDoc);
  return toDTO({ ...overrideDoc, _id: res.insertedId });
}

/**
 * Edit this occurrence and all future ones: truncate the original series to end
 * the day before originalDate, then create a new series from originalDate forward.
 */
export async function editThisAndFuture(
  ownerId: string,
  seriesId: string,
  originalDate: Date,
  patch: UpdateEventInput,
): Promise<EventDTO | null> {
  if (!ObjectId.isValid(seriesId)) return null;
  const c = await col();

  const base = await c.findOne({ _id: new ObjectId(seriesId), ownerId });
  if (!base) return null;

  // Truncate original series to end just before this occurrence
  const cutoff = new Date(originalDate.getTime() - 1);
  await c.updateOne(
    { _id: new ObjectId(seriesId), ownerId },
    { $set: { 'recurrence.until': cutoff, updatedAt: new Date() } },
  );

  // New series starts at originalDate with edits applied
  const duration = base.end.getTime() - base.start.getTime();
  const newStart = (patch.start as Date | undefined) ?? originalDate;
  // Preserve the time-of-day from newStart, but anchor to originalDate's date
  const newEnd = (patch.end as Date | undefined) ?? new Date(newStart.getTime() + duration);

  const now = new Date();
  const newDoc: EventDoc = {
    ownerId,
    title: (patch.title as string | undefined) ?? base.title,
    start: newStart,
    end: newEnd,
    allDay: (patch.allDay as boolean | undefined) ?? base.allDay,
    color: (patch.color as ChipColor | undefined) ?? base.color,
    location: (patch.location as string | undefined) ?? base.location,
    description: (patch.description as string | undefined) ?? base.description,
    conferencing: base.conferencing,
    recurrence: base.recurrence ? { ...base.recurrence, until: undefined } : undefined,
    createdAt: now,
    updatedAt: now,
  };
  // Apply any recurrence override from patch
  if ('recurrence' in patch) {
    if (patch.recurrence == null) delete newDoc.recurrence;
    else newDoc.recurrence = patch.recurrence as Recurrence;
  }

  const res = await c.insertOne(newDoc);
  return toDTO({ ...newDoc, _id: res.insertedId });
}

/** Delete just this occurrence by adding to exdates. */
export async function deleteThisOnly(
  ownerId: string,
  seriesId: string,
  originalDate: Date,
): Promise<boolean> {
  if (!ObjectId.isValid(seriesId)) return false;
  const c = await col();
  const res = await c.updateOne(
    { _id: new ObjectId(seriesId), ownerId },
    { $addToSet: { exdates: originalDate }, $set: { updatedAt: new Date() } },
  );
  return res.modifiedCount === 1;
}

/** Delete this occurrence and all future ones by truncating the series. */
export async function deleteThisAndFuture(
  ownerId: string,
  seriesId: string,
  originalDate: Date,
): Promise<boolean> {
  if (!ObjectId.isValid(seriesId)) return false;
  const c = await col();
  const cutoff = new Date(originalDate.getTime() - 1);
  const res = await c.updateOne(
    { _id: new ObjectId(seriesId), ownerId },
    { $set: { 'recurrence.until': cutoff, updatedAt: new Date() } },
  );
  return res.modifiedCount === 1;
}

export const CHIP_COLORS: ChipColor[] = [
  'coral', 'sand', 'sage', 'slate', 'plum', 'ochre', 'rose', 'stone',
];

export function parseRecurrenceInput(input: unknown): Recurrence | null | undefined {
  if (input === undefined) return undefined;
  if (input === null) return null;
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
