import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/lib/session';
import { deleteNotification, markRead } from '@/lib/notifications';

export async function PATCH(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const ok = await markRead(user.id, id);
    if (!ok) return NextResponse.json({ error: 'not_found' }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof Response) return err;
    console.error('[PATCH /api/inbox/:id]', err);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const ok = await deleteNotification(user.id, id);
    if (!ok) return NextResponse.json({ error: 'not_found' }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof Response) return err;
    console.error('[DELETE /api/inbox/:id]', err);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}
