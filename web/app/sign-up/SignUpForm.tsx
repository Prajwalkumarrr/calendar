'use client';

import { signIn } from 'next-auth/react';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import styles from './sign-up.module.css';

export function SignUpForm() {
  const router = useRouter();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      // 1. Create account
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email, password, name }),
      });
      const data = await res.json();
      if (!res.ok) {
        const msg =
          data.error === 'invalid_email' ? 'Enter a valid email.' :
          data.error === 'password_too_short' ? 'Password must be at least 8 characters.' :
          data.error === 'email_in_use' ? 'That email already has an account. Sign in instead.' :
          'Something went wrong. Try again.';
        throw new Error(msg);
      }

      // 2. Sign in immediately
      const signInRes = await signIn('credentials', {
        email,
        password,
        redirect: false,
      });
      if (signInRes?.error) {
        throw new Error('Account created but sign-in failed. Please sign in manually.');
      }

      // 3. Go to onboarding
      router.push('/onboarding');
    } catch (e) {
      setError((e as Error).message);
      setSubmitting(false);
    }
  }

  return (
    <div className={styles.shell}>
      <div className={styles.form}>
        <Link href="/" className={styles.back} aria-label="Back to home">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M19 12H5" />
            <path d="m12 19-7-7 7-7" />
          </svg>
          Home
        </Link>

        <div className={styles.center}>
          <div className={styles.brand}>
            <div className={styles.brandDot}>E</div>
            ElevAIte
          </div>

          <h1 className={styles.h1}>Create your account</h1>
          <p className={styles.sub}>Free for individuals. No credit card required.</p>

          <button type="button" className={styles.google} onClick={() => signIn('google', { callbackUrl: '/home' })}>
            <span className={styles.gicon}>G</span>
            Sign up with Google
          </button>

          <div className={styles.divider}>or</div>

          <form onSubmit={handleSubmit}>
            <label className={styles.field}>
              <span className={styles.fieldLbl}>Your name</span>
              <input
                className={styles.input}
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Prem Sai"
                disabled={submitting}
                autoComplete="name"
              />
            </label>
            <label className={styles.field}>
              <span className={styles.fieldLbl}>Email</span>
              <input
                className={styles.input}
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                disabled={submitting}
                autoComplete="email"
              />
            </label>
            <label className={styles.field}>
              <span className={styles.fieldLbl}>
                Password <small style={{ color: 'var(--text-3)' }}>(8+ chars)</small>
              </span>
              <input
                className={styles.input}
                type="password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 8 characters"
                disabled={submitting}
                autoComplete="new-password"
              />
            </label>

            {error && <div className={styles.error}>{error}</div>}

            <button
              type="submit"
              className={styles.primary}
              disabled={submitting || !email || password.length < 8}
            >
              {submitting ? 'Creating account…' : 'Create account'}
            </button>
          </form>

          <p className={styles.note}>
            Already have an account? <Link href="/sign-in">Sign in</Link>
          </p>
          <p className={styles.note} style={{ marginTop: 8 }}>
            By continuing, you agree to our <a href="/terms">Terms</a> and{' '}
            <a href="/privacy">Privacy Policy</a>.
          </p>
        </div>
      </div>

      <aside className={styles.side} aria-hidden>
        <div className={styles.sideInner}>
          <h2 className={styles.sideHead}>
            A warm, <span className={styles.coral}>fast</span> calendar — free for individuals.
          </h2>
          <ul className={styles.sideList}>
            <li>Calendar with drag-to-create, ⌘K, day/week/month views</li>
            <li>Scheduling links that turn into real bookings</li>
            <li>Inbox, recurring events, time zones, dark mode</li>
            <li>Real Mongo persistence — your data is yours</li>
          </ul>
        </div>
      </aside>
    </div>
  );
}
