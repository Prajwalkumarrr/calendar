import { NextRequest, NextResponse } from 'next/server';
import { getLinkBySlug, generateSlots } from '@/lib/scheduling';
import { listEventsInRange } from '@/lib/events';

function pad(n: number) { return String(n).padStart(2, '0'); }
function localKey(d: Date) { return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; }

// Public — returns available slots.
// Single day:  GET ?date=YYYY-MM-DD            → { slots: [...] }
// Date range:  GET ?from=ISO&to=ISO            → { slots: { "YYYY-MM-DD": [...] } }
export async function GET(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    const { searchParams } = new URL(req.url);
    const link = await getLinkBySlug(slug);
    if (!link) return NextResponse.json({ error: 'not_found' }, { status: 404 });

    const fromParam = searchParams.get('from');
    const toParam = searchParams.get('to');

    if (fromParam && toParam) {
      // Range mode — return Record<dateStr, slots[]>
      const rangeStart = new Date(fromParam);
      const rangeEnd = new Date(toParam);
      if (isNaN(+rangeStart) || isNaN(+rangeEnd)) {
        return NextResponse.json({ error: 'invalid from/to' }, { status: 400 });
      }

      // Clamp to at most 60 days to avoid excessive DB queries
      const msRange = rangeEnd.getTime() - rangeStart.getTime();
      const dayCount = Math.min(Math.ceil(msRange / 86_400_000), 60);

      const events = await listEventsInRange(link.ownerId, rangeStart, rangeEnd);
      const busy = events.map((e) => ({ start: new Date(e.start), end: new Date(e.end) }));

      const slots: Record<string, { start: string; end: string }[]> = {};
      for (let i = 0; i < dayCount; i++) {
        const day = new Date(rangeStart);
        day.setDate(rangeStart.getDate() + i);
        day.setHours(0, 0, 0, 0);
        const daySlots = generateSlots(link, day, busy);
        if (daySlots.length > 0) slots[localKey(day)] = daySlots;
      }

      return NextResponse.json({ slots });
    }

    // Single-day mode (legacy)
    const dateStr = searchParams.get('date');
    if (!dateStr) return NextResponse.json({ error: 'date or from+to required' }, { status: 400 });
    const date = new Date(`${dateStr}T00:00:00`);
    if (isNaN(+date)) return NextResponse.json({ error: 'invalid date' }, { status: 400 });

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
