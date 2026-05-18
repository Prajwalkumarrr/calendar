import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/lib/session';
import { getRoleInWorkspace, listMembers, updateMemberRole, removeMember, type Role } from '@/lib/workspaces';
import { logAudit } from '@/lib/audit';
import { getUserById } from '@/lib/users';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const role = await getRoleInWorkspace(user.id, id);
    if (!role) return NextResponse.json({ error: 'not_a_member' }, { status: 403 });
    const members = await listMembers(id);
    return NextResponse.json({ members, myRole: role });
  } catch (err) {
    if (err instanceof Response) return err;
    console.error('[GET /api/workspaces/:id/members]', err);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}

const ROLES: Role[] = ['owner', 'admin', 'member', 'guest'];

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const myRole = await getRoleInWorkspace(user.id, id);
    if (!myRole || (myRole !== 'owner' && myRole !== 'admin')) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    }
    const body = await req.json().catch(() => ({}));
    const userId = String(body.userId ?? '');
    const role = body.role as Role;
    if (!userId || !ROLES.includes(role)) {
      return NextResponse.json({ error: 'invalid_role_or_user' }, { status: 400 });
    }
    if (role === 'owner') {
      // Only the current owner can transfer ownership — and that's a v2 feature
      return NextResponse.json({ error: 'cannot_assign_owner_yet' }, { status: 400 });
    }
    const prevRole = await getRoleInWorkspace(userId, id);
    const ok = await updateMemberRole(id, userId, role);
    if (!ok) return NextResponse.json({ error: 'not_found' }, { status: 404 });
    const target = await getUserById(userId).catch(() => null);
    void logAudit({
      workspaceId: id,
      actorId: user.id,
      action: 'member.role_changed',
      targetUserId: userId,
      targetName: target?.name,
      targetEmail: target?.email,
      details: { fromRole: prevRole, toRole: role },
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof Response) return err;
    console.error('[PATCH /api/workspaces/:id/members]', err);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const myRole = await getRoleInWorkspace(user.id, id);
    if (!myRole || (myRole !== 'owner' && myRole !== 'admin')) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    }
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');
    if (!userId) return NextResponse.json({ error: 'userId_required' }, { status: 400 });
    // Don't allow removing the owner.
    const targetRole = await getRoleInWorkspace(userId, id);
    if (targetRole === 'owner') {
      return NextResponse.json({ error: 'cannot_remove_owner' }, { status: 400 });
    }
    const target = await getUserById(userId).catch(() => null);
    const ok = await removeMember(id, userId);
    if (!ok) return NextResponse.json({ error: 'not_found' }, { status: 404 });
    void logAudit({
      workspaceId: id,
      actorId: user.id,
      action: 'member.removed',
      targetUserId: userId,
      targetName: target?.name,
      targetEmail: target?.email,
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof Response) return err;
    console.error('[DELETE /api/workspaces/:id/members]', err);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}
