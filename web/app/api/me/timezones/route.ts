import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/lib/session';
import { getTimezones, updateTimezones, type SavedTimezone } from '@/lib/users';

const MAX = 8;

export async function GET() {
  try {
    const user = await requireUser();
    const timezones = await getTimezones(user.id);
    return NextResponse.json({ timezones });
  } catch (err) {
    if (err instanceof Response) return err;
    console.error('[GET /api/me/timezones]', err);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}

function isValidTz(s: string): boolean {
  if (s === 'local') return true;
  try {
    new Intl.DateTimeFormat('en', { timeZone: s });
    return true;
  } catch {
    return false;
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const user = await requireUser();
    const body = await req.json().catch(() => ({}));
    if (!Array.isArray(body.timezones)) {
      return NextResponse.json({ error: 'timezones must be an array' }, { status: 400 });
    }
    if (body.timezones.length > MAX) {
      return NextResponse.json({ error: `at most ${MAX} timezones` }, { status: 400 });
    }
    const list: SavedTimezone[] = [];
    for (const z of body.timezones) {
      if (typeof z?.tz !== 'string' || typeof z?.label !== 'string') {
        return NextResponse.json({ error: 'invalid zone entry' }, { status: 400 });
      }
      if (!isValidTz(z.tz)) {
        return NextResponse.json({ error: `invalid tz: ${z.tz}` }, { status: 400 });
      }
      const tz = z.tz.slice(0, 64);
      const label = z.label.trim().slice(0, 40) || z.tz.split('/').pop() || 'Zone';
      list.push({ tz, label });
    }
    const updated = await updateTimezones(user.id, list);
    if (!updated) return NextResponse.json({ error: 'not_found' }, { status: 404 });
    return NextResponse.json({ timezones: updated });
  } catch (err) {
    if (err instanceof Response) return err;
    console.error('[PATCH /api/me/timezones]', err);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}
