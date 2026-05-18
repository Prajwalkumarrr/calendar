import { NextResponse } from 'next/server';
import { getLinkBySlug } from '@/lib/scheduling';
import { getUserById } from '@/lib/users';

// Public — no auth required. Returns minimal info about a scheduling link by slug,
// plus the host's display name + initial for the booking page.
export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    const link = await getLinkBySlug(slug);
    if (!link) return NextResponse.json({ error: 'not_found' }, { status: 404 });

    const host = await getUserById(link.ownerId);
    const hostName = host?.name ?? 'Your host';
    const hostInitial = (host?.name ?? host?.email ?? 'H').trim()[0]?.toUpperCase() ?? 'H';

    return NextResponse.json({
      link: {
        title: link.title,
        slug: link.slug,
        durationMin: link.durationMin,
        description: link.description,
        bufferMin: link.bufferMin,
        workingHours: link.workingHours,
        hostName,
        hostInitial,
      },
    });
  } catch (err) {
    console.error('[GET /api/public/links/:slug]', err);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}
