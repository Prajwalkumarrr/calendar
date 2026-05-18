import { ObjectId } from 'mongodb';
import clientPromise from './mongodb';

const DB_NAME = 'elevaite';
const COLLECTION = 'events';

export type ChipColor = 'coral' | 'sand' | 'sage' | 'slate' | 'plum' | 'ochre' | 'rose' | 'stone';

export type EventDoc = {
  _id?: ObjectId;
  ownerId: string;          // NextAuth user.id (matches users._id as a string)
  title: string;
  start: Date;
  end: Date;
  allDay?: boolean;
  color: ChipColor;
  location?: string;
  description?: string;
  conferencing?: { provider: 'meet' | 'zoom' | 'teams' | 'custom'; url?: string };
  createdAt: Date;
  updatedAt: Date;
};

export type EventDTO = Omit<EventDoc, '_id' | 'start' | 'end' | 'createdAt' | 'updatedAt'> & {
  id: string;
  start: string; // ISO
  end: string;   // ISO
};

function toDTO(doc: EventDoc): EventDTO {
  return {
    id: doc._id!.toHexString(),
    ownerId: doc.ownerId,
    title: doc.title,
    start: doc.start.toISOString(),
    end: doc.end.toISOString(),
    allDay: doc.allDay,
    color: doc.color,
    location: doc.location,
    description: doc.description,
    conferencing: doc.conferencing,
  };
}

async function col() {
  const client = await clientPromise;
  return client.db(DB_NAME).collection<EventDoc>(COLLECTION);
}

export async function listEventsInRange(
  ownerId: string,
  from: Date,
  to: Date,
): Promise<EventDTO[]> {
  const c = await col();
  const docs = await c
    .find({ ownerId, start: { $lt: to }, end: { $gt: from } })
    .sort({ start: 1 })
    .toArray();
  return docs.map(toDTO);
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
  const res = await c.findOneAndUpdate(
    { _id: new ObjectId(id), ownerId },
    { $set: { ...patch, updatedAt: new Date() } },
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
