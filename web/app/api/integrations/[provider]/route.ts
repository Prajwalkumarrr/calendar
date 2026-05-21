import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/lib/session';
import { deleteIntegration, type ProviderId } from '@/lib/integrations';
import { invalidateGoogleCalendarCache } from '@/lib/integrations/google-calendar';

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ provider: string }> }) {
  try {
    const user = await requireUser();
    const { provider } = await params;
    const ok = await deleteIntegration(user.id, provider as ProviderId);
    if (!ok) return NextResponse.json({ error: 'not_connected' }, { status: 404 });
    if (provider === 'google-calendar') invalidateGoogleCalendarCache(user.id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof Response) return err;
    console.error('[DELETE /api/integrations/:provider]', err);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}
