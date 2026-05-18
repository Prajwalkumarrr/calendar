import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/lib/session';
import { findTime } from '@/lib/find-time';

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    const body = await req.json().catch(() => ({}));

    const memberIds = Array.isArray(body.memberIds) ? body.memberIds.map(String) : [user.id];
    if (!memberIds.includes(user.id)) memberIds.unshift(user.id); // always include caller
    const durationMin = Number(body.durationMin) || 30;
    const from = body.from ? new Date(body.from) : new Date();
    const to = body.to ? new Date(body.to) : new Date(Date.now() + 14 * 86_400_000);
    if (isNaN(+from) || isNaN(+to) || from >= to) {
      return NextResponse.json({ error: 'invalid date range' }, { status: 400 });
    }
    const workdayStart = typeof body.workdayStart === 'string' ? body.workdayStart : '09:00';
    const workdayEnd = typeof body.workdayEnd === 'string' ? body.workdayEnd : '17:00';
    const weekdaysOnly = body.weekdaysOnly !== false;
    const stepMin = Number(body.stepMin) || 30;

    const slots = await findTime({
      memberIds,
      durationMin,
      from,
      to,
      workdayStart,
      workdayEnd,
      weekdaysOnly,
      stepMin,
      maxSlots: 60,
    });
    return NextResponse.json({ slots, memberIds });
  } catch (err) {
    if (err instanceof Response) return err;
    console.error('[POST /api/find-time]', err);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}
