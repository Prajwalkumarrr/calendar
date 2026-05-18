import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/lib/session';
import { getAppearancePrefs, updateAppearancePrefs, type AppearancePrefs } from '@/lib/users';

export async function GET() {
  try {
    const user = await requireUser();
    const prefs = await getAppearancePrefs(user.id);
    return NextResponse.json({ prefs });
  } catch (err) {
    if (err instanceof Response) return err;
    console.error('[GET /api/me/appearance]', err);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}

const HEX_RE = /^#[0-9a-fA-F]{6}$/;

export async function PATCH(req: NextRequest) {
  try {
    const user = await requireUser();
    const body = await req.json().catch(() => ({}));
    const patch: Partial<AppearancePrefs> = {};

    if ('theme' in body) {
      if (!['light', 'dark', 'system'].includes(body.theme)) {
        return NextResponse.json({ error: 'invalid_theme' }, { status: 400 });
      }
      patch.theme = body.theme;
    }
    if ('density' in body) {
      if (!['compact', 'regular', 'comfy'].includes(body.density)) {
        return NextResponse.json({ error: 'invalid_density' }, { status: 400 });
      }
      patch.density = body.density;
    }
    if ('accent' in body) {
      if (typeof body.accent !== 'string' || !HEX_RE.test(body.accent)) {
        return NextResponse.json({ error: 'invalid_accent' }, { status: 400 });
      }
      patch.accent = body.accent;
    }
    if ('chipStyle' in body) {
      if (!['fill', 'tinted', 'outline'].includes(body.chipStyle)) {
        return NextResponse.json({ error: 'invalid_chipStyle' }, { status: 400 });
      }
      patch.chipStyle = body.chipStyle;
    }
    if ('weekStart' in body) {
      if (!['mon', 'sun', 'sat'].includes(body.weekStart)) {
        return NextResponse.json({ error: 'invalid_weekStart' }, { status: 400 });
      }
      patch.weekStart = body.weekStart;
    }
    if ('timeFormat' in body) {
      if (!['12', '24'].includes(body.timeFormat)) {
        return NextResponse.json({ error: 'invalid_timeFormat' }, { status: 400 });
      }
      patch.timeFormat = body.timeFormat;
    }

    const updated = await updateAppearancePrefs(user.id, patch);
    if (!updated) return NextResponse.json({ error: 'not_found' }, { status: 404 });
    return NextResponse.json({ prefs: updated });
  } catch (err) {
    if (err instanceof Response) return err;
    console.error('[PATCH /api/me/appearance]', err);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}
