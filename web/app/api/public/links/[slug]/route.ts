import { NextResponse } from 'next/server';
import { getLinkBySlug } from '@/lib/scheduling';

// Public — no auth required. Returns minimal info about a scheduling link by slug.
export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    const link = await getLinkBySlug(slug);
    if (!link) return NextResponse.json({ error: 'not_found' }, { status: 404 });
    return NextResponse.json({
      link: {
        title: link.title,
        slug: link.slug,
        durationMin: link.durationMin,
        description: link.description,
        bufferMin: link.bufferMin,
        workingHours: link.workingHours,
      },
    });
  } catch (err) {
    console.error('[GET /api/public/links/:slug]', err);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}
