import { NextRequest, NextResponse } from 'next/server';
import { requireUser, getCurrentUser } from '@/lib/session';
import { acceptInvitation, findInvitationByToken } from '@/lib/workspaces';

// Public — fetch invitation details so the accept page can show context.
export async function GET(_req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await params;
    const found = await findInvitationByToken(token);
    if (!found) return NextResponse.json({ error: 'invalid_or_expired' }, { status: 404 });
    const user = await getCurrentUser();
    return NextResponse.json({
      invitation: found.invitation,
      workspaceName: found.workspaceName,
      signedIn: !!user,
      currentUserEmail: user?.email,
    });
  } catch (err) {
    console.error('[GET /api/invitations/:token]', err);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}

// Requires sign-in — accepts the invitation, adds user to workspace.
export async function POST(_req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  try {
    const user = await requireUser();
    const { token } = await params;
    const result = await acceptInvitation(token, user.id);
    if (!result) return NextResponse.json({ error: 'invalid_or_expired' }, { status: 404 });
    return NextResponse.json({ workspaceId: result.workspaceId });
  } catch (err) {
    if (err instanceof Response) return err;
    console.error('[POST /api/invitations/:token]', err);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}
