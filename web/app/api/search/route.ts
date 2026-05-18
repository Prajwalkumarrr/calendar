import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/lib/session';
import clientPromise from '@/lib/mongodb';

const DB_NAME = 'elevaite';

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

type EventHit = {
  type: 'event';
  id: string;
  title: string;
  start: string;
  end: string;
  location?: string;
  color: string;
};
type LinkHit = {
  type: 'link';
  id: string;
  title: string;
  slug: string;
  durationMin: number;
};
type BookingHit = {
  type: 'booking';
  id: string;
  inviteeName: string;
  inviteeEmail: string;
  start: string;
  end: string;
  linkTitle?: string;
};

export type SearchResults = {
  events: EventHit[];
  links: LinkHit[];
  bookings: BookingHit[];
  total: number;
};

export async function GET(req: NextRequest) {
  try {
    const user = await requireUser();
    const { searchParams } = new URL(req.url);
    const q = (searchParams.get('q') ?? '').trim();
    if (q.length === 0) {
      return NextResponse.json({ events: [], links: [], bookings: [], total: 0 } satisfies SearchResults);
    }
    const re = new RegExp(escapeRegex(q), 'i');
    const limit = Math.min(20, Number(searchParams.get('limit')) || 8);

    const client = await clientPromise;
    const db = client.db(DB_NAME);

    const [events, links, bookings] = await Promise.all([
      db.collection('events')
        .find({
          ownerId: user.id,
          $or: [{ title: re }, { location: re }, { description: re }],
        })
        .sort({ start: -1 })
        .limit(limit)
        .toArray(),
      db.collection('schedulingLinks')
        .find({
          ownerId: user.id,
          $or: [{ title: re }, { slug: re }, { description: re }],
        })
        .sort({ createdAt: -1 })
        .limit(limit)
        .toArray(),
      db.collection('bookings')
        .find({
          ownerId: user.id,
          $or: [{ inviteeName: re }, { inviteeEmail: re }, { note: re }],
        })
        .sort({ createdAt: -1 })
        .limit(limit)
        .toArray(),
    ]);

    const eventHits: EventHit[] = events.map((e) => ({
      type: 'event',
      id: e._id.toHexString(),
      title: e.title,
      start: e.start.toISOString(),
      end: e.end.toISOString(),
      location: e.location,
      color: e.color,
    }));

    const linkHits: LinkHit[] = links.map((l) => ({
      type: 'link',
      id: l._id.toHexString(),
      title: l.title,
      slug: l.slug,
      durationMin: l.durationMin,
    }));

    const bookingHits: BookingHit[] = await Promise.all(
      bookings.map(async (b) => {
        const linkDoc = b.linkId ? await db.collection('schedulingLinks').findOne({ _id: b.linkId }) : null;
        return {
          type: 'booking' as const,
          id: b._id.toHexString(),
          inviteeName: b.inviteeName,
          inviteeEmail: b.inviteeEmail,
          start: b.start.toISOString(),
          end: b.end.toISOString(),
          linkTitle: linkDoc?.title,
        };
      }),
    );

    const total = eventHits.length + linkHits.length + bookingHits.length;
    return NextResponse.json({ events: eventHits, links: linkHits, bookings: bookingHits, total } satisfies SearchResults);
  } catch (err) {
    if (err instanceof Response) return err;
    console.error('[GET /api/search]', err);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}
