import { headers } from 'next/headers';
import Link from 'next/link';
import { InviteAccept, type InvitationInfo } from './InviteAccept';
import './invite.css';

export const metadata = { title: 'Workspace invitation · ElevAIte' };

async function fetchInvitation(token: string): Promise<InvitationInfo | null> {
  const h = await headers();
  const host = h.get('host') ?? 'localhost:3000';
  const cookie = h.get('cookie') ?? '';
  const protocol = host.startsWith('localhost') ? 'http' : 'https';
  const res = await fetch(`${protocol}://${host}/api/invitations/${token}`, {
    headers: { cookie },
    cache: 'no-store',
  });
  if (!res.ok) return null;
  return res.json();
}

export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const info = await fetchInvitation(token);
  if (!info) {
    return (
      <main className="inv-shell">
        <div className="inv-bloom" />
        <div className="inv-bad-shell">
          <h1>Invitation not found</h1>
          <p>This invitation link is invalid or has expired. Ask the person who invited you to send a fresh link.</p>
          <div style={{ marginTop: 20 }}>
            <Link className="inv-ghost" href="/" style={{ display: 'inline-flex', padding: '0 18px' }}>
              Go home
            </Link>
          </div>
        </div>
      </main>
    );
  }
  return <InviteAccept info={info} token={token} />;
}
