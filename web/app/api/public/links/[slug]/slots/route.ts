import { NextRequest, NextResponse } from 'next/server';
import { getLinkBySlug, generateSlots } from '@/lib/scheduling';
import { listEventsInRange } from '@/lib/events';

// Public — returns available slots for a date.
// GET /api/public/links/:slug/slots?date=YYYY-MM-DD
export async function GET(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    const { searchParams } = new URL(req.url);
    const dateStr = searchParams.get('date');
    if (!dateStr) return NextResponse.json({ error: 'date required (YYYY-MM-DD)' }, { status: 400 });
    const date = new Date(`${dateStr}T00:00:00`);
    if (isNaN(+date)) return NextResponse.json({ error: 'invalid date' }, { status: 400 });

    const link = await getLinkBySlug(slug);
    if (!link) return NextResponse.json({ error: 'not_found' }, { status: 404 });

    const dayStart = new Date(date); dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(date); dayEnd.setHours(23, 59, 59, 999);
    const events = await listEventsInRange(link.ownerId, dayStart, dayEnd);
    const busy = events.map((e) => ({ start: new Date(e.start), end: new Date(e.end) }));
    const slots = generateSlots(link, date, busy);

    return NextResponse.json({ slots });
  } catch (err) {
    console.error('[GET /api/public/links/:slug/slots]', err);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}
