import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/lib/session';
import { createLink, listLinks, DURATION_OPTIONS } from '@/lib/scheduling';

export async function GET() {
  try {
    const user = await requireUser();
    const links = await listLinks(user.id);
    return NextResponse.json({ links });
  } catch (err) {
    if (err instanceof Response) return err;
    console.error('[GET /api/scheduling-links]', err);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    const body = await req.json();
    if (typeof body.title !== 'string' || !body.title.trim()) {
      return NextResponse.json({ error: 'title required' }, { status: 400 });
    }
    if (!DURATION_OPTIONS.includes(body.durationMin)) {
      return NextResponse.json({ error: 'invalid duration' }, { status: 400 });
    }
    const created = await createLink({
      ownerId: user.id,
      title: body.title,
      slug: typeof body.slug === 'string' ? body.slug : undefined,
      durationMin: body.durationMin,
      description: typeof body.description === 'string' ? body.description : undefined,
    });
    if ('error' in created) {
      return NextResponse.json({ error: created.error }, { status: 400 });
    }
    return NextResponse.json({ link: created }, { status: 201 });
  } catch (err) {
    if (err instanceof Response) return err;
    console.error('[POST /api/scheduling-links]', err);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}
