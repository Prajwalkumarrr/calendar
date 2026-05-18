import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/lib/session';
import { getNotificationPrefs, updateNotificationPrefs, type NotificationPrefs } from '@/lib/users';

export async function GET() {
  try {
    const user = await requireUser();
    const prefs = await getNotificationPrefs(user.id);
    return NextResponse.json({ prefs });
  } catch (err) {
    if (err instanceof Response) return err;
    console.error('[GET /api/me/notifications]', err);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}

const ALLOWED_KEYS: (keyof NotificationPrefs)[] = [
  'desktop', 'email', 'mobile', 'sms',
  'reminders', 'reminderLeadMin', 'digest',
  'invites', 'rsvp', 'cancel', 'reschedule', 'bookings',
  'slack', 'linear',
];

export async function PATCH(req: NextRequest) {
  try {
    const user = await requireUser();
    const body = await req.json().catch(() => ({}));
    const patch: Partial<NotificationPrefs> = {};
    for (const k of ALLOWED_KEYS) {
      if (k in body) {
        const v = body[k];
        if (k === 'reminderLeadMin') {
          const n = Number(v);
          if (![1, 5, 10, 15, 30].includes(n)) {
            return NextResponse.json({ error: 'invalid_reminderLeadMin' }, { status: 400 });
          }
          patch[k] = n;
        } else if (typeof v === 'boolean') {
          (patch as Record<string, boolean>)[k] = v;
        } else {
          return NextResponse.json({ error: `invalid_${k}` }, { status: 400 });
        }
      }
    }
    const updated = await updateNotificationPrefs(user.id, patch);
    if (!updated) return NextResponse.json({ error: 'not_found' }, { status: 404 });
    return NextResponse.json({ prefs: updated });
  } catch (err) {
    if (err instanceof Response) return err;
    console.error('[PATCH /api/me/notifications]', err);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}
