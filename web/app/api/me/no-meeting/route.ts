import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/lib/session';
import { getNoMeetingDays, updateNoMeetingDays } from '@/lib/users';

export async function GET() {
  try {
    const user = await requireUser();
    const days = await getNoMeetingDays(user.id);
    return NextResponse.json({ days });
  } catch (err) {
    if (err instanceof Response) return err;
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const user = await requireUser();
    const body = await req.json();
    const { days } = body ?? {};
    if (!Array.isArray(days) || days.some((d: unknown) => typeof d !== 'number' || d < 0 || d > 6)) {
      return NextResponse.json({ error: 'days must be an array of integers 0–6' }, { status: 400 });
    }
    const saved = await updateNoMeetingDays(user.id, days as number[]);
    return NextResponse.json({ days: saved });
  } catch (err) {
    if (err instanceof Response) return err;
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}
