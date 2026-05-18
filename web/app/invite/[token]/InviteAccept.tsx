'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import './invite.css';

export type InvitationInfo = {
  invitation: {
    email: string;
    role: string;
    expiresAt: string;
  };
  workspaceName: string;
  signedIn: boolean;
  currentUserEmail?: string;
};

export function InviteAccept({ info, token }: { info: InvitationInfo; token: string }) {
  const router = useRouter();
  const [accepting, setAccepting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const inviteEmail = info.invitation.email.toLowerCase();
  const currentEmail = info.currentUserEmail?.toLowerCase();
  const emailMatches = !info.signedIn || currentEmail === inviteEmail;

  async function accept() {
    setAccepting(true);
    setError(null);
    try {
      const res = await fetch(`/api/invitations/${token}`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(
          data.error === 'invalid_or_expired'
            ? 'This invitation is invalid or expired.'
            : 'Could not accept invitation.',
        );
      }
      router.push('/home');
    } catch (e) {
      setError((e as Error).message);
      setAccepting(false);
    }
  }

  return (
    <div className="inv-shell">
      <div className="inv-bloom" />
      <div className="inv-card">
        <Link href="/" className="inv-brand">
          <span className="inv-brand-mark">E</span> ElevAIte
        </Link>

        <div className="inv-eyebrow">You&apos;re invited</div>
        <h1 className="inv-h">Join <strong>{info.workspaceName}</strong></h1>
        <p className="inv-sub">
          You&apos;ve been invited to join <b>{info.workspaceName}</b> on ElevAIte as a{' '}
          <b>{info.invitation.role}</b>.
        </p>

        <div className="inv-meta">
          <div>
            <div className="inv-meta__lbl">Invited email</div>
            <div className="inv-meta__val">{info.invitation.email}</div>
          </div>
          <div>
            <div className="inv-meta__lbl">Role</div>
            <div className="inv-meta__val" style={{ textTransform: 'capitalize' }}>{info.invitation.role}</div>
          </div>
        </div>

        <div className="inv-stack">
          {!info.signedIn ? (
            <>
              <Link
                className="inv-cta"
                href={`/sign-up?email=${encodeURIComponent(inviteEmail)}`}
                style={{ textDecoration: 'none' }}
              >
                Create account & accept
              </Link>
              <Link
                className="inv-ghost"
                href={`/sign-in?email=${encodeURIComponent(inviteEmail)}&callbackUrl=${encodeURIComponent(`/invite/${token}`)}`}
              >
                Sign in instead
              </Link>
            </>
          ) : emailMatches ? (
            <button className="inv-cta" onClick={accept} disabled={accepting}>
              {accepting ? 'Accepting…' : `Accept and join ${info.workspaceName}`}
            </button>
          ) : (
            <>
              <div className="inv-err">
                You&apos;re signed in as <b>{info.currentUserEmail}</b>, but this invitation
                is for <b>{inviteEmail}</b>. Sign out and try again with the right account.
              </div>
              <Link className="inv-ghost" href={`/sign-in?email=${encodeURIComponent(inviteEmail)}&callbackUrl=${encodeURIComponent(`/invite/${token}`)}`}>
                Switch account
              </Link>
            </>
          )}
        </div>

        {error && <div className="inv-err">{error}</div>}

        <div className="inv-note">
          Expires {new Date(info.invitation.expiresAt).toLocaleDateString(undefined, {
            month: 'long', day: 'numeric', year: 'numeric',
          })}.
        </div>
      </div>
    </div>
  );
}
