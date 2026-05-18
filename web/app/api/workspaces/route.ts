import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/lib/session';
import { createWorkspace, listWorkspacesForUser } from '@/lib/workspaces';

export async function GET() {
  try {
    const user = await requireUser();
    const workspaces = await listWorkspacesForUser(user.id);
    return NextResponse.json({ workspaces });
  } catch (err) {
    if (err instanceof Response) return err;
    console.error('[GET /api/workspaces]', err);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    const body = await req.json().catch(() => ({}));
    const name = String(body.name ?? '').trim();
    if (!name) return NextResponse.json({ error: 'name_required' }, { status: 400 });
    if (name.length > 80) return NextResponse.json({ error: 'name_too_long' }, { status: 400 });
    const ws = await createWorkspace({ name, ownerId: user.id });
    return NextResponse.json({ workspace: ws }, { status: 201 });
  } catch (err) {
    if (err instanceof Response) return err;
    console.error('[POST /api/workspaces]', err);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}
