import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/lib/session';
import { deleteLink, updateLink } from '@/lib/scheduling';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const body = await req.json();
    const patch: Record<string, unknown> = {};
    if (typeof body.title === 'string') patch.title = body.title;
    if (typeof body.description === 'string') patch.description = body.description;
    if (typeof body.durationMin === 'number') patch.durationMin = body.durationMin;
    if (typeof body.active === 'boolean') patch.active = body.active;
    if (body.workingHours && typeof body.workingHours === 'object') patch.workingHours = body.workingHours;
    if (typeof body.bufferMin === 'number') patch.bufferMin = body.bufferMin;
    const updated = await updateLink(user.id, id, patch);
    if (!updated) return NextResponse.json({ error: 'not_found' }, { status: 404 });
    return NextResponse.json({ link: updated });
  } catch (err) {
    if (err instanceof Response) return err;
    console.error('[PATCH /api/scheduling-links/:id]', err);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const ok = await deleteLink(user.id, id);
    if (!ok) return NextResponse.json({ error: 'not_found' }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof Response) return err;
    console.error('[DELETE /api/scheduling-links/:id]', err);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}
