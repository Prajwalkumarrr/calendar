import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { SignOutButton } from './SignOutButton';

export const metadata = { title: 'Dashboard · ElevAIte' };

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect('/sign-in');

  const user = session.user;

  return (
    <main
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 32,
        background: 'var(--bg)',
        fontFamily: 'var(--font-sans)',
      }}
    >
      <div
        style={{
          maxWidth: 520,
          width: '100%',
          background: 'var(--surface-elevated)',
          border: '1px solid var(--hairline-strong)',
          borderRadius: 16,
          padding: 32,
          boxShadow: 'var(--shadow)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 }}>
          {user.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={user.image}
              alt={user.name ?? 'You'}
              width={48}
              height={48}
              style={{ borderRadius: '50%', border: '1px solid var(--hairline-strong)' }}
            />
          ) : null}
          <div>
            <div style={{ fontSize: 18, fontWeight: 600, letterSpacing: '-0.01em' }}>
              {user.name ?? 'Welcome'}
            </div>
            <div style={{ fontSize: 13, color: 'var(--text-2)' }}>{user.email}</div>
          </div>
        </div>

        <div
          style={{
            padding: 14,
            background: 'var(--coral-subtle)',
            color: 'var(--coral-strong, var(--coral))',
            borderRadius: 10,
            fontSize: 13,
            lineHeight: 1.55,
            marginBottom: 20,
          }}
        >
          You&apos;re signed in. Your account is now saved in MongoDB. Phase 3 will replace this
          stub with the actual calendar.
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <a
            href="/"
            style={{
              flex: 1,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: 40,
              padding: '0 14px',
              background: 'var(--surface)',
              border: '1px solid var(--hairline-strong)',
              borderRadius: 10,
              fontSize: 13.5,
              fontWeight: 500,
              color: 'var(--text)',
              textDecoration: 'none',
            }}
          >
            Home
          </a>
          <SignOutButton />
        </div>
      </div>
    </main>
  );
}
