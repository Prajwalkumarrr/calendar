import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/lib/session';
import { listNotifications, markAllRead, unreadCount } from '@/lib/notifications';

export async function GET(req: NextRequest) {
  try {
    const user = await requireUser();
    const { searchParams } = new URL(req.url);
    const unreadOnly = searchParams.get('unread') === '1';
    const [items, unread] = await Promise.all([
      listNotifications(user.id, { unreadOnly, limit: 100 }),
      unreadCount(user.id),
    ]);
    return NextResponse.json({ items, unreadCount: unread });
  } catch (err) {
    if (err instanceof Response) return err;
    console.error('[GET /api/inbox]', err);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}

// PATCH /api/inbox  body: { allRead: true }
export async function PATCH(req: NextRequest) {
  try {
    const user = await requireUser();
    const body = await req.json().catch(() => ({}));
    if (body.allRead === true) {
      const n = await markAllRead(user.id);
      return NextResponse.json({ ok: true, marked: n });
    }
    return NextResponse.json({ error: 'unknown action' }, { status: 400 });
  } catch (err) {
    if (err instanceof Response) return err;
    console.error('[PATCH /api/inbox]', err);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}
