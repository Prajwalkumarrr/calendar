'use client';

import { signIn } from 'next-auth/react';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import styles from './sign-up.module.css';

type Step = 'form' | 'verify' | 'done';

export function SignUpForm() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('form');

  // Form state
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Verify state
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const codeRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Misc
  const [submitting, setSubmitting] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState(0);

  useEffect(() => {
    if (step === 'verify') {
      setTimeout(() => codeRefs.current[0]?.focus(), 50);
    }
  }, [step]);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const id = setTimeout(() => setResendCooldown((n) => n - 1), 1000);
    return () => clearTimeout(id);
  }, [resendCooldown]);

  function setCodeAt(i: number, v: string) {
    const cleaned = v.replace(/\D/g, '').slice(-1);
    setCode((prev) => {
      const next = [...prev];
      next[i] = cleaned;
      return next;
    });
    if (cleaned && i < 5) codeRefs.current[i + 1]?.focus();
  }

  function onCodeKey(i: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace' && !code[i] && i > 0) {
      codeRefs.current[i - 1]?.focus();
    } else if (e.key === 'ArrowLeft' && i > 0) codeRefs.current[i - 1]?.focus();
    else if (e.key === 'ArrowRight' && i < 5) codeRefs.current[i + 1]?.focus();
  }

  function onCodePaste(e: React.ClipboardEvent<HTMLInputElement>) {
    const txt = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (txt.length === 0) return;
    e.preventDefault();
    setCode(txt.padEnd(6, '').split('').slice(0, 6).map((c) => (c === ' ' ? '' : c)));
    codeRefs.current[Math.min(txt.length, 5)]?.focus();
  }

  async function submitSignup(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
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
      setStep('verify');
      setNotice(data.resent
        ? `We resent a code to ${email}. Check your inbox.`
        : `We sent a code to ${email}. Check your inbox.`);
      setResendCooldown(30);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  async function submitVerify(e: React.FormEvent) {
    e.preventDefault();
    const codeStr = code.join('');
    if (codeStr.length !== 6) return;
    setVerifying(true);
    setError(null);
    try {
      const res = await fetch('/api/auth/verify', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email, code: codeStr }),
      });
      const data = await res.json();
      if (!res.ok) {
        const msg =
          data.error === 'wrong_code' ? "That code didn't match. Double-check and try again." :
          data.error === 'code_expired' ? 'That code expired. Tap "Resend" to get a fresh one.' :
          'Verification failed. Try again.';
        throw new Error(msg);
      }
      // Sign them in immediately
      const signInRes = await signIn('credentials', {
        email,
        password,
        redirect: false,
      });
      if (signInRes?.error) {
        // Verified but sign-in failed for some reason — send them to sign-in
        router.push(`/sign-in?email=${encodeURIComponent(email)}`);
        return;
      }
      router.push('/onboarding');
    } catch (e) {
      setError((e as Error).message);
      setVerifying(false);
    }
  }

  async function resendCode() {
    if (resendCooldown > 0) return;
    setError(null);
    setNotice(null);
    try {
      const res = await fetch('/api/auth/resend-code', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) throw new Error('Could not resend code.');
      setNotice(`We sent a fresh code to ${email}.`);
      setResendCooldown(30);
    } catch (e) {
      setError((e as Error).message);
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

          {step === 'form' && (
            <>
              <h1 className={styles.h1}>Create your account</h1>
              <p className={styles.sub}>
                Free for individuals. You&apos;ll verify your email next.
              </p>

              <button type="button" className={styles.google} onClick={() => signIn('google', { callbackUrl: '/home' })}>
                <span className={styles.gicon}>G</span>
                Sign up with Google
              </button>

              <div className={styles.divider}>or</div>

              <form onSubmit={submitSignup}>
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
                  <span className={styles.fieldLbl}>Password <small style={{ color: 'var(--text-3)' }}>(8+ chars)</small></span>
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

                <button type="submit" className={styles.primary} disabled={submitting || !email || password.length < 8}>
                  {submitting ? 'Creating account…' : 'Create account'}
                </button>
              </form>

              {error && <div className={styles.error}>{error}</div>}

              <p className={styles.note}>
                Already have an account? <Link href="/sign-in">Sign in</Link>
              </p>
              <p className={styles.note} style={{ marginTop: 8 }}>
                By continuing, you agree to our <a href="/terms">Terms</a> and{' '}
                <a href="/privacy">Privacy Policy</a>.
              </p>
            </>
          )}

          {step === 'verify' && (
            <>
              <h1 className={styles.h1}>Verify your email</h1>
              <p className={styles.sub}>
                We sent a 6-digit code to <strong>{email}</strong>.
              </p>

              <form onSubmit={submitVerify}>
                <div className={styles.codeRow}>
                  {[0, 1, 2, 3, 4, 5].map((i) => (
                    <input
                      key={i}
                      ref={(el) => { codeRefs.current[i] = el; }}
                      className={styles.codeCell}
                      inputMode="numeric"
                      maxLength={1}
                      value={code[i]}
                      onChange={(e) => setCodeAt(i, e.target.value)}
                      onKeyDown={(e) => onCodeKey(i, e)}
                      onPaste={i === 0 ? onCodePaste : undefined}
                      disabled={verifying}
                      autoComplete="one-time-code"
                    />
                  ))}
                </div>

                <button
                  type="submit"
                  className={styles.primary}
                  disabled={verifying || code.join('').length !== 6}
                >
                  {verifying ? 'Verifying…' : 'Verify & continue'}
                </button>
              </form>

              {notice && !error && <div className={styles.success}>{notice}</div>}
              {error && <div className={styles.error}>{error}</div>}

              <p className={styles.note}>
                Didn&apos;t get a code?{' '}
                <button
                  type="button"
                  className={styles.resend}
                  onClick={resendCode}
                  disabled={resendCooldown > 0}
                >
                  {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend code'}
                </button>
                {' · '}
                <button
                  type="button"
                  className={styles.resend}
                  style={{ color: 'var(--text-3)' }}
                  onClick={() => { setStep('form'); setError(null); setNotice(null); }}
                >
                  Change email
                </button>
              </p>
            </>
          )}
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
