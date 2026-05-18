import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/lib/session';
import { getRoleInWorkspace } from '@/lib/workspaces';
import { listAudit } from '@/lib/audit';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const role = await getRoleInWorkspace(user.id, id);
    if (!role) return NextResponse.json({ error: 'not_a_member' }, { status: 403 });
    const entries = await listAudit(id, 50);
    return NextResponse.json({ entries });
  } catch (err) {
    if (err instanceof Response) return err;
    console.error('[GET /api/workspaces/:id/audit]', err);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}
