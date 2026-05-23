import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/lib/session';
import { createInvitation, getRoleInWorkspace, listInvitations, type Role } from '@/lib/workspaces';
import { logAudit } from '@/lib/audit';
import { getUserById } from '@/lib/users';
import { sendWorkspaceInviteEmail } from '@/lib/email';

const ROLES: Role[] = ['admin', 'member', 'guest']; // owner can't be invited

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const role = await getRoleInWorkspace(user.id, id);
    if (!role) return NextResponse.json({ error: 'not_a_member' }, { status: 403 });
    const invitations = await listInvitations(id);
    return NextResponse.json({ invitations });
  } catch (err) {
    if (err instanceof Response) return err;
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const myRole = await getRoleInWorkspace(user.id, id);
    if (!myRole || (myRole !== 'owner' && myRole !== 'admin')) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    }
    const body = await req.json().catch(() => ({}));
    const email = String(body.email ?? '').toLowerCase().trim();
    const role = (body.role as Role) ?? 'member';
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      return NextResponse.json({ error: 'invalid_email' }, { status: 400 });
    }
    if (!ROLES.includes(role)) {
      return NextResponse.json({ error: 'invalid_role' }, { status: 400 });
    }
    const invitation = await createInvitation({
      workspaceId: id,
      email,
      role,
      invitedBy: user.id,
    });
    void logAudit({
      workspaceId: id,
      actorId: user.id,
      action: 'invitation.sent',
      targetEmail: email,
      details: { role },
    });
    // Send invite email (fire-and-forget — don't fail the request if email fails)
    const [inviter, ws] = await Promise.all([
      getUserById(user.id).catch(() => null),
      import('@/lib/workspaces').then((m) => m.listWorkspacesForUser(user.id)).catch(() => []),
    ]);
    const wsName = (Array.isArray(ws) ? ws.find((w) => w.id === id)?.name : null) ?? 'the workspace';
    const appUrl = (process.env.PUBLIC_APP_URL ?? 'http://localhost:3000').replace(/\/$/, '');
    void sendWorkspaceInviteEmail({
      toEmail: email,
      inviterName: inviter?.name ?? inviter?.email ?? 'A teammate',
      workspaceName: wsName,
      role,
      inviteUrl: `${appUrl}/invite/${invitation.token}`,
      expiresAt: new Date(invitation.expiresAt),
    }).catch(() => {});
    return NextResponse.json({ invitation }, { status: 201 });
  } catch (err) {
    if (err instanceof Response) return err;
    console.error('[POST /api/workspaces/:id/invitations]', err);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}
