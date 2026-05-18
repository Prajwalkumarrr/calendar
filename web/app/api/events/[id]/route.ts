import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/lib/session';
import { updateEvent, deleteEvent, CHIP_COLORS, ChipColor } from '@/lib/events';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const body = await req.json();

    const patch: Record<string, unknown> = {};
    if (typeof body.title === 'string') patch.title = body.title;
    if (typeof body.start === 'string') {
      const d = new Date(body.start);
      if (isNaN(+d)) return NextResponse.json({ error: 'invalid start' }, { status: 400 });
      patch.start = d;
    }
    if (typeof body.end === 'string') {
      const d = new Date(body.end);
      if (isNaN(+d)) return NextResponse.json({ error: 'invalid end' }, { status: 400 });
      patch.end = d;
    }
    if (typeof body.allDay === 'boolean') patch.allDay = body.allDay;
    if (CHIP_COLORS.includes(body.color as ChipColor)) patch.color = body.color;
    if (typeof body.location === 'string') patch.location = body.location;
    if (typeof body.description === 'string') patch.description = body.description;

    const updated = await updateEvent(user.id, id, patch);
    if (!updated) return NextResponse.json({ error: 'not_found' }, { status: 404 });
    return NextResponse.json({ event: updated });
  } catch (err) {
    if (err instanceof Response) return err;
    console.error('[PATCH /api/events/:id]', err);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const ok = await deleteEvent(user.id, id);
    if (!ok) return NextResponse.json({ error: 'not_found' }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof Response) return err;
    console.error('[DELETE /api/events/:id]', err);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}
