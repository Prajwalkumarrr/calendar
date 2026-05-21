import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/lib/session';
import { listNotifications, markAllRead, unreadCount, createNotification, type NotificationKind } from '@/lib/notifications';

const ALLOWED_KINDS: NotificationKind[] = [
  'booking.created', 'booking.cancelled', 'booking.rescheduled',
  'event.invited', 'event.updated', 'event.cancelled',
  'rsvp.received', 'system',
];

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

// POST /api/inbox  — create a notification (used by the client-side reminder poller)
export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    const body = await req.json().catch(() => ({}));
    const { kind, title, body: msgBody, href, refId } = body;
    if (typeof title !== 'string' || !title.trim()) {
      return NextResponse.json({ error: 'title required' }, { status: 400 });
    }
    const safeKind: NotificationKind = ALLOWED_KINDS.includes(kind) ? kind : 'system';
    const note = await createNotification({
      ownerId: user.id,
      kind: safeKind,
      title: String(title).slice(0, 200),
      body: msgBody ? String(msgBody).slice(0, 500) : undefined,
      href: href ? String(href) : undefined,
      refId: refId ? String(refId) : undefined,
    });
    return NextResponse.json({ ok: true, notification: note }, { status: 201 });
  } catch (err) {
    if (err instanceof Response) return err;
    console.error('[POST /api/inbox]', err);
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
