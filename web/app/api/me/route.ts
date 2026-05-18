import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/lib/session';
import { getProfile, updateProfile } from '@/lib/users';
import { createNotification } from '@/lib/notifications';

export async function GET() {
  try {
    const user = await requireUser();
    const profile = await getProfile(user.id);
    if (!profile) return NextResponse.json({ error: 'not_found' }, { status: 404 });
    return NextResponse.json({ profile });
  } catch (err) {
    if (err instanceof Response) return err;
    console.error('[GET /api/me]', err);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const user = await requireUser();
    const body = await req.json().catch(() => ({}));
    const res = await updateProfile(user.id, {
      displayName: body.displayName,
      bio: body.bio,
      handle: body.handle,
      timezone: body.timezone,
    });
    if (!res.ok) {
      const status = res.error === 'not_found' ? 404 : 400;
      return NextResponse.json({ error: res.error }, { status });
    }
    // Fire-and-forget welcome-style notification for first-time profile setup
    if (body.handle && !body._silent) {
      void createNotification({
        ownerId: user.id,
        kind: 'system',
        title: 'Profile updated',
        body: `Your booking handle is now /book/${res.profile.handle}.`,
        href: '/settings#profile',
      });
    }
    return NextResponse.json({ profile: res.profile });
  } catch (err) {
    if (err instanceof Response) return err;
    console.error('[PATCH /api/me]', err);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}
