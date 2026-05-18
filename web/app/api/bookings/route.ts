import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/session';
import { listBookingsForHost } from '@/lib/scheduling';

// Auth'd — list the signed-in host's bookings, most recent first.
export async function GET() {
  try {
    const user = await requireUser();
    const bookings = await listBookingsForHost(user.id);
    return NextResponse.json({ bookings });
  } catch (err) {
    if (err instanceof Response) return err;
    console.error('[GET /api/bookings]', err);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}
