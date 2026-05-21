import { NextRequest, NextResponse } from 'next/server';
import { createBooking, generateSlots, getLinkBySlug } from '@/lib/scheduling';
import { listEventsInRange } from '@/lib/events';
import { getUserById, getNotificationPrefs } from '@/lib/users';
import { sendBookingEmails } from '@/lib/email';
import { createNotification } from '@/lib/notifications';

// Public — invitee creates a booking.
// POST /api/public/bookings { slug, startISO, name, email, note? }
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { slug, startISO, name, email, note } = body ?? {};
    if (typeof slug !== 'string') return NextResponse.json({ error: 'slug required' }, { status: 400 });
    if (typeof startISO !== 'string') return NextResponse.json({ error: 'startISO required' }, { status: 400 });
    if (typeof name !== 'string' || !name.trim()) return NextResponse.json({ error: 'name required' }, { status: 400 });
    if (typeof email !== 'string' || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      return NextResponse.json({ error: 'invalid email' }, { status: 400 });
    }

    const link = await getLinkBySlug(slug);
    if (!link) return NextResponse.json({ error: 'link_not_found' }, { status: 404 });

    const start = new Date(startISO);
    const end = new Date(start.getTime() + link.durationMin * 60_000);
    if (isNaN(+start)) return NextResponse.json({ error: 'invalid start' }, { status: 400 });
    if (start < new Date()) return NextResponse.json({ error: 'slot is in the past' }, { status: 409 });

    // Re-validate the slot is still available (someone might have booked between fetch and submit)
    const dayStart = new Date(start); dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(start); dayEnd.setHours(23, 59, 59, 999);
    const events = await listEventsInRange(link.ownerId, dayStart, dayEnd);
    const busy = events.map((e) => ({ start: new Date(e.start), end: new Date(e.end) }));
    const available = generateSlots(link, start, busy);
    const stillOpen = available.some((s) => new Date(s.start).getTime() === start.getTime());
    if (!stillOpen) return NextResponse.json({ error: 'slot_taken' }, { status: 409 });

    const booking = await createBooking({
      link,
      inviteeName: name,
      inviteeEmail: email,
      start,
      end,
      note: typeof note === 'string' ? note : undefined,
    });

    // Fire-and-forget side effects: notification to host's inbox + (when wired) email
    const host = await getUserById(link.ownerId);
    const prefs = await getNotificationPrefs(link.ownerId);
    if (prefs.bookings) {
      void createNotification({
        ownerId: link.ownerId,
        kind: 'booking.created',
        title: `${name} booked ${link.title}`,
        body: `${start.toLocaleString(undefined, { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })} (${link.durationMin} min)${typeof note === 'string' && note ? ` — "${note.slice(0, 120)}"` : ''}`,
        href: `/booked/${booking.id}`,
        actorName: name,
        actorEmail: email,
        refId: booking.id,
      });
    }
    if (prefs.email && host?.email) {
      void sendBookingEmails({
        inviteeName: name,
        inviteeEmail: email,
        hostName: host.name ?? 'your host',
        hostEmail: host.email,
        linkTitle: link.title,
        start,
        end,
        durationMin: link.durationMin,
        bookingId: booking.id,
        note: typeof note === 'string' ? note : undefined,
        meetingUrl: booking.meetingUrl,
        meetingProvider: booking.meetingProvider,
      });
    }

    return NextResponse.json({ booking }, { status: 201 });
  } catch (err) {
    console.error('[POST /api/public/bookings]', err);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}
