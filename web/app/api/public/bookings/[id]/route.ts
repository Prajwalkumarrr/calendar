import { NextResponse } from 'next/server';
import { getBooking, cancelBooking, rescheduleBooking, getLinkBySlug } from '@/lib/scheduling';
import { getUserById } from '@/lib/users';
import { sendCancellationEmails, sendRescheduleEmails } from '@/lib/email';

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Ctx) {
  try {
    const { id } = await params;
    const booking = await getBooking(id);
    if (!booking) return NextResponse.json({ error: 'not_found' }, { status: 404 });
    return NextResponse.json({ booking });
  } catch (err) {
    console.error('[GET /api/public/bookings/:id]', err);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: Ctx) {
  try {
    const { id } = await params;
    const booking = await getBooking(id);
    if (!booking) return NextResponse.json({ error: 'not_found' }, { status: 404 });
    if (booking.status === 'cancelled') return NextResponse.json({ error: 'already_cancelled' }, { status: 409 });

    const cancelled = await cancelBooking(id);
    if (!cancelled) return NextResponse.json({ error: 'cancel_failed' }, { status: 500 });

    // Fire-and-forget emails
    const host = await getUserById(booking.ownerId);
    if (host) {
      sendCancellationEmails({
        inviteeName: booking.inviteeName,
        inviteeEmail: booking.inviteeEmail,
        hostName: host.name ?? host.email ?? '',
        hostEmail: host.email,
        linkTitle: booking.link?.title ?? 'Meeting',
        start: new Date(booking.start),
        durationMin: booking.link?.durationMin ?? 30,
      }).catch(() => {});
    }

    return NextResponse.json({ booking: cancelled });
  } catch (err) {
    console.error('[DELETE /api/public/bookings/:id]', err);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}

export async function PATCH(req: Request, { params }: Ctx) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { start, end } = body ?? {};
    if (!start || !end) return NextResponse.json({ error: 'start_and_end_required' }, { status: 400 });

    const newStart = new Date(start);
    const newEnd = new Date(end);
    if (isNaN(newStart.getTime()) || isNaN(newEnd.getTime())) {
      return NextResponse.json({ error: 'invalid_dates' }, { status: 400 });
    }

    const booking = await getBooking(id);
    if (!booking) return NextResponse.json({ error: 'not_found' }, { status: 404 });
    if (booking.status === 'cancelled') return NextResponse.json({ error: 'booking_cancelled' }, { status: 409 });

    const oldStart = new Date(booking.start);
    const rescheduled = await rescheduleBooking(id, newStart, newEnd);
    if (!rescheduled) return NextResponse.json({ error: 'reschedule_failed' }, { status: 500 });

    const host = await getUserById(booking.ownerId);
    if (host) {
      sendRescheduleEmails({
        inviteeName: booking.inviteeName,
        inviteeEmail: booking.inviteeEmail,
        hostName: host.name ?? host.email ?? '',
        hostEmail: host.email,
        linkTitle: booking.link?.title ?? 'Meeting',
        oldStart,
        newStart,
        durationMin: booking.link?.durationMin ?? 30,
        bookingId: id,
      }).catch(() => {});
    }

    return NextResponse.json({ booking: rescheduled });
  } catch (err) {
    console.error('[PATCH /api/public/bookings/:id]', err);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}
