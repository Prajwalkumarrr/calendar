import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/session';
import { listIntegrations, getProviders } from '@/lib/integrations';

export async function GET() {
  try {
    const user = await requireUser();
    const [providers, connected] = await Promise.all([
      Promise.resolve(getProviders()),
      listIntegrations(user.id),
    ]);
    return NextResponse.json({ providers, connected });
  } catch (err) {
    if (err instanceof Response) return err;
    console.error('[GET /api/integrations]', err);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}
