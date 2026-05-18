import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/lib/session';
import { markOnboarded, isOnboarded } from '@/lib/users';

export async function GET() {
  try {
    const user = await requireUser();
    const done = await isOnboarded(user.id);
    return NextResponse.json({ onboarded: done });
  } catch (err) {
    if (err instanceof Response) return err;
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    const body = await req.json().catch(() => ({}));
    const persona = body?.persona as 'student' | 'startup' | 'solo' | undefined;
    await markOnboarded(user.id, persona);
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof Response) return err;
    console.error('[POST /api/me/onboarding]', err);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}
