import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/lib/session';
import { createEvent, listEventsInRange, CHIP_COLORS, ChipColor, parseRecurrenceInput } from '@/lib/events';
import { getIntegration } from '@/lib/integrations';
import { mirrorEventToNotion } from '@/lib/integrations/notion';

export async function GET(req: NextRequest) {
  try {
    const user = await requireUser();
    const { searchParams } = new URL(req.url);
    const fromParam = searchParams.get('from');
    const toParam = searchParams.get('to');
    if (!fromParam || !toParam) {
      return NextResponse.json({ error: 'from and to query params required (ISO dates)' }, { status: 400 });
    }
    const from = new Date(fromParam);
    const to = new Date(toParam);
    if (isNaN(+from) || isNaN(+to)) {
      return NextResponse.json({ error: 'invalid from/to' }, { status: 400 });
    }
    const events = await listEventsInRange(user.id, from, to);
    return NextResponse.json({ events });
  } catch (err) {
    if (err instanceof Response) return err;
    console.error('[GET /api/events]', err);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    const body = await req.json();
    const { title, start, end, allDay, color, location, description, recurrence } = body ?? {};

    if (typeof title !== 'string') {
      return NextResponse.json({ error: 'title required' }, { status: 400 });
    }
    if (typeof start !== 'string' || typeof end !== 'string') {
      return NextResponse.json({ error: 'start/end required as ISO strings' }, { status: 400 });
    }
    const startDate = new Date(start);
    const endDate = new Date(end);
    if (isNaN(+startDate) || isNaN(+endDate) || endDate <= startDate) {
      return NextResponse.json({ error: 'invalid date range' }, { status: 400 });
    }
    const safeColor: ChipColor = CHIP_COLORS.includes(color) ? color : 'coral';

    const parsedRecurrence = parseRecurrenceInput(recurrence);
    const created = await createEvent({
      ownerId: user.id,
      title,
      start: startDate,
      end: endDate,
      allDay: !!allDay,
      color: safeColor,
      location: location || undefined,
      description: description || undefined,
      recurrence: parsedRecurrence ?? undefined,
    });
    // Mirror to Notion if connected and a database is configured
    const notionIntegration = await getIntegration(user.id, 'notion');
    if (notionIntegration?.accountInfo?.id) {
      void mirrorEventToNotion(user.id, notionIntegration.accountInfo.id, {
        title,
        start: startDate,
        end: endDate,
        location: location || undefined,
        description: description || undefined,
      }).catch(() => {});
    }

    return NextResponse.json({ event: created }, { status: 201 });
  } catch (err) {
    if (err instanceof Response) return err;
    console.error('[POST /api/events]', err);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}
