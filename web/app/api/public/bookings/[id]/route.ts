import { NextResponse } from 'next/server';
import { getBooking } from '@/lib/scheduling';

// Public — fetch a booking by ID for the confirmation page.
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
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
