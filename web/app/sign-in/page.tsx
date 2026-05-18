'use client';

import { signIn } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';
import Link from 'next/link';
import styles from './sign-in.module.css';

function SignInInner() {
  const router = useRouter();
  const params = useSearchParams();
  const callbackUrl = params.get('callbackUrl') ?? '/home';
  const errorParam = params.get('error');
  const [loading, setLoading] = useState(false);

  const [email, setEmail] = useState(params.get('email') ?? '');
  const [password, setPassword] = useState('');
  const [signingIn, setSigningIn] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const errorMessage =
    formError ??
    (errorParam === 'OAuthAccountNotLinked'
      ? 'This email is already linked to a different sign-in method.'
      : errorParam === 'CredentialsSignin'
        ? "Email or password didn't match. Try again."
        : errorParam
          ? 'Sign in failed. Please try again.'
          : null);

  async function submitCredentials(e: React.FormEvent) {
    e.preventDefault();
    setSigningIn(true);
    setFormError(null);
    try {
      const res = await signIn('credentials', {
        email,
        password,
        redirect: false,
        callbackUrl,
      });
      if (res?.error) {
        if (res.error === 'email_not_verified') {
          setFormError('Email not verified yet. Check your inbox or sign up again.');
        } else {
          setFormError("Email or password didn't match. Try again.");
        }
        return;
      }
      router.push(callbackUrl);
    } finally {
      setSigningIn(false);
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

          <h1 className={styles.h1}>Welcome back.</h1>
          <p className={styles.sub}>Sign in with Google, or use your email + password.</p>

          <button
            type="button"
            className={styles.google}
            onClick={() => { setLoading(true); signIn('google', { callbackUrl }); }}
            disabled={loading || signingIn}
          >
            <span className={styles.gicon}>G</span>
            {loading ? 'Redirecting to Google…' : 'Continue with Google'}
          </button>

          <div className={styles.divider}>or</div>

          <form onSubmit={submitCredentials}>
            <label className={styles.field}>
              <span className={styles.fieldLabel}>Email</span>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                disabled={signingIn}
                autoComplete="email"
                style={inputStyle}
              />
            </label>
            <label className={styles.field}>
              <span className={styles.fieldLabel}>Password</span>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                disabled={signingIn}
                autoComplete="current-password"
                style={inputStyle}
              />
            </label>
            <button
              type="submit"
              disabled={signingIn || !email || !password}
              style={{
                width: '100%', height: 44, marginTop: 8,
                background: 'var(--text)', color: 'var(--bg)',
                border: 0, borderRadius: 10, fontSize: 14, fontWeight: 500,
                cursor: signingIn ? 'progress' : 'pointer',
                fontFamily: 'inherit',
                opacity: signingIn ? 0.6 : 1,
              }}
            >
              {signingIn ? 'Signing in…' : 'Sign in'}
            </button>
          </form>

          {errorMessage && <div className={styles.error}>{errorMessage}</div>}

          <p className={styles.note}>
            New to ElevAIte? <Link href="/sign-up">Create an account</Link>
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
            A warm, <span className={styles.coral}>fast</span> calendar — free if you&apos;re a student.
          </h2>

          <div className={styles.preview}>
            <div className={styles.previewHead}>
              <span>Today</span>
              <span className={styles.time}>Wed</span>
            </div>
            <div className={styles.previewRow}>
              <span className={styles.time}>09:00</span>
              <span className={`${styles.chip} ${styles.chipSlate}`}>Standup</span>
            </div>
            <div className={`${styles.previewRow} ${styles.now}`}>
              <span className={styles.time}>10:30</span>
              <span className={styles.chip}>Roadmap review</span>
            </div>
            <div className={styles.previewRow}>
              <span className={styles.time}>13:00</span>
              <span className={`${styles.chip} ${styles.chipSand}`}>Lunch w/ Aisha</span>
            </div>
            <div className={styles.previewRow}>
              <span className={styles.time}>15:00</span>
              <span className={`${styles.chip} ${styles.chipSage}`}>Focus · ship Phase 2</span>
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '11px 12px',
  border: '1px solid var(--hairline-strong)',
  background: 'var(--bg)', borderRadius: 9,
  fontSize: 14, color: 'var(--text)',
  fontFamily: 'inherit', outline: 'none',
};

export default function SignInPage() {
  return (
    <Suspense fallback={null}>
      <SignInInner />
    </Suspense>
  );
}
