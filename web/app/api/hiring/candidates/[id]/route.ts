import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/lib/session';
import { updateCandidate, deleteCandidate, HIRING_STAGES, type HiringStage } from '@/lib/hiring';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const body = await req.json().catch(() => ({}));

    const patch: Parameters<typeof updateCandidate>[2] = {};
    if (typeof body.name === 'string' && body.name.trim()) patch.name = body.name.trim();
    if (typeof body.email === 'string') patch.email = body.email.trim().toLowerCase();
    if (typeof body.role === 'string' && body.role.trim()) patch.role = body.role.trim();
    if (typeof body.notes === 'string') patch.notes = body.notes;
    if (typeof body.linkedinUrl === 'string') patch.linkedinUrl = body.linkedinUrl;
    if (HIRING_STAGES.map((s) => s.id).includes(body.stage)) {
      patch.stage = body.stage as HiringStage;
    }

    const candidate = await updateCandidate(user.id, id, patch);
    if (!candidate) return NextResponse.json({ error: 'not_found' }, { status: 404 });
    return NextResponse.json({ candidate });
  } catch (err) {
    if (err instanceof Response) return err;
    console.error('[PATCH /api/hiring/candidates/:id]', err);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const ok = await deleteCandidate(user.id, id);
    if (!ok) return NextResponse.json({ error: 'not_found' }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof Response) return err;
    console.error('[DELETE /api/hiring/candidates/:id]', err);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}
