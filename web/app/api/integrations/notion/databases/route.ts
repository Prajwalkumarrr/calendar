import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/session';
import { listNotionDatabases } from '@/lib/integrations/notion';

export async function GET() {
  try {
    const user = await requireUser();
    const databases = await listNotionDatabases(user.id);
    return NextResponse.json({ databases });
  } catch (err) {
    if (err instanceof Response) return err;
    console.error('[GET /api/integrations/notion/databases]', err);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}
