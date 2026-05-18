import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/lib/session';
import { getRoleInWorkspace, revokeInvitation } from '@/lib/workspaces';
import { logAudit } from '@/lib/audit';
import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string; invId: string }> }) {
  try {
    const user = await requireUser();
    const { id, invId } = await params;
    const role = await getRoleInWorkspace(user.id, id);
    if (!role || (role !== 'owner' && role !== 'admin')) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    }
    // Capture invitation email before deleting so we can log it
    let targetEmail: string | undefined;
    if (ObjectId.isValid(invId)) {
      const client = await clientPromise;
      const inv = await client.db('elevaite').collection('invitations').findOne({ _id: new ObjectId(invId) });
      targetEmail = (inv?.email as string | undefined);
    }
    const ok = await revokeInvitation(id, invId);
    if (!ok) return NextResponse.json({ error: 'not_found' }, { status: 404 });
    void logAudit({
      workspaceId: id,
      actorId: user.id,
      action: 'invitation.revoked',
      targetEmail,
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof Response) return err;
    console.error('[DELETE /api/workspaces/:id/invitations/:invId]', err);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}
