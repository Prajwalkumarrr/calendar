import { ObjectId } from 'mongodb';
import clientPromise from './mongodb';

const DB_NAME = 'elevaite';
const COLLECTION = 'notifications';

export type NotificationKind =
  | 'booking.created'
  | 'booking.cancelled'
  | 'booking.rescheduled'
  | 'event.invited'
  | 'event.updated'
  | 'event.cancelled'
  | 'rsvp.received'
  | 'system';

export type NotificationDoc = {
  _id?: ObjectId;
  ownerId: string;
  kind: NotificationKind;
  title: string;
  body?: string;
  href?: string;          // where to go when clicked
  actorName?: string;     // who triggered it (booking invitee, etc.)
  actorEmail?: string;
  read: boolean;
  createdAt: Date;
  refId?: string;         // related booking/event id
};

export type NotificationDTO = {
  id: string;
  kind: NotificationKind;
  title: string;
  body?: string;
  href?: string;
  actorName?: string;
  actorEmail?: string;
  read: boolean;
  createdAt: string;
  refId?: string;
};

function toDTO(doc: NotificationDoc): NotificationDTO {
  return {
    id: doc._id!.toHexString(),
    kind: doc.kind,
    title: doc.title,
    body: doc.body,
    href: doc.href,
    actorName: doc.actorName,
    actorEmail: doc.actorEmail,
    read: doc.read,
    createdAt: doc.createdAt.toISOString(),
    refId: doc.refId,
  };
}

async function col() {
  const client = await clientPromise;
  return client.db(DB_NAME).collection<NotificationDoc>(COLLECTION);
}

export type CreateNotificationInput = Omit<NotificationDoc, '_id' | 'read' | 'createdAt'>;

export async function createNotification(input: CreateNotificationInput): Promise<NotificationDTO> {
  const doc: NotificationDoc = {
    ...input,
    read: false,
    createdAt: new Date(),
  };
  const c = await col();
  const res = await c.insertOne(doc);
  return toDTO({ ...doc, _id: res.insertedId });
}

export async function listNotifications(
  ownerId: string,
  opts: { unreadOnly?: boolean; limit?: number } = {},
): Promise<NotificationDTO[]> {
  const c = await col();
  const filter: Record<string, unknown> = { ownerId };
  if (opts.unreadOnly) filter.read = false;
  const docs = await c
    .find(filter)
    .sort({ createdAt: -1 })
    .limit(opts.limit ?? 100)
    .toArray();
  return docs.map(toDTO);
}

export async function unreadCount(ownerId: string): Promise<number> {
  const c = await col();
  return c.countDocuments({ ownerId, read: false });
}

export async function markRead(ownerId: string, id: string): Promise<boolean> {
  if (!ObjectId.isValid(id)) return false;
  const c = await col();
  const res = await c.updateOne({ _id: new ObjectId(id), ownerId }, { $set: { read: true } });
  return res.modifiedCount === 1;
}

export async function markAllRead(ownerId: string): Promise<number> {
  const c = await col();
  const res = await c.updateMany({ ownerId, read: false }, { $set: { read: true } });
  return res.modifiedCount;
}

export async function deleteNotification(ownerId: string, id: string): Promise<boolean> {
  if (!ObjectId.isValid(id)) return false;
  const c = await col();
  const res = await c.deleteOne({ _id: new ObjectId(id), ownerId });
  return res.deletedCount === 1;
}
