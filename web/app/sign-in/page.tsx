'use client';

import { signIn } from 'next-auth/react';
import { useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';
import Link from 'next/link';
import styles from './sign-in.module.css';

function SignInInner() {
  const params = useSearchParams();
  const callbackUrl = params.get('callbackUrl') ?? '/dashboard';
  const errorParam = params.get('error');
  const [loading, setLoading] = useState(false);

  const errorMessage =
    errorParam === 'OAuthAccountNotLinked'
      ? 'This email is already linked to a different sign-in method.'
      : errorParam
        ? 'Sign in failed. Please try again.'
        : null;

  return (
    <div className={styles.shell}>
      {/* Form column */}
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
          <p className={styles.sub}>
            Sign in to your calendar. New here? Signing in with Google creates your account.
          </p>

          <button
            type="button"
            className={styles.google}
            onClick={() => {
              setLoading(true);
              signIn('google', { callbackUrl });
            }}
            disabled={loading}
          >
            <span className={styles.gicon}>G</span>
            {loading ? 'Redirecting to Google…' : 'Continue with Google'}
          </button>

          {errorMessage && <div className={styles.error}>{errorMessage}</div>}

          <p className={styles.note}>
            By continuing, you agree to our <a href="/terms">Terms</a> and{' '}
            <a href="/privacy">Privacy Policy</a>.
          </p>
        </div>
      </div>

      {/* Side panel */}
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

export default function SignInPage() {
  return (
    <Suspense fallback={null}>
      <SignInInner />
    </Suspense>
  );
}
