'use client';

// 3-step onboarding flow — faithful port of prototype/onboarding.html
// Wires persona selection to localStorage (will move to user record in next pass).

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import './onboarding.css';

type Persona = 'student' | 'startup' | 'solo';

const PERSONAS: { id: Persona; emoji: string; title: string; desc: string }[] = [
  { id: 'student', emoji: '🎓', title: 'Student',  desc: 'Classes, study blocks, group projects, office hours.' },
  { id: 'startup', emoji: '⚡', title: 'Startup',  desc: 'Standups, customer calls, shipping, investor syncs.' },
  { id: 'solo',    emoji: '🧘', title: 'Just me',  desc: 'Personal life, focus blocks, friends, family.' },
];

export function OnboardingFlow({ userEmail }: { userEmail: string }) {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [persona, setPersona] = useState<Persona>('student');
  const [finishing, setFinishing] = useState(false);

  // Restore persona from localStorage if user re-enters
  useEffect(() => {
    const saved = localStorage.getItem('elevaite.persona') as Persona | null;
    if (saved) setPersona(saved);
  }, []);

  function next() {
    if (step < 3) setStep((s) => (s + 1) as 1 | 2 | 3);
    else finish();
  }

  function back() {
    if (step > 1) setStep((s) => (s - 1) as 1 | 2 | 3);
  }

  async function finish() {
    setFinishing(true);
    localStorage.setItem('elevaite.persona', persona);
    localStorage.setItem('elevaite.onboarded', '1');
    // Persist to user record so we don't re-prompt on next sign-in
    try {
      await fetch('/api/me/onboarding', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ persona }),
      });
    } catch {
      /* network error — we still proceed; the localStorage flag carries us */
    }
    router.push('/home');
  }

  return (
    <div className="ob-shell">
      {/* Top */}
      <header className="ob-top">
        <Link className="ob-brand" href="/">
          <span className="ob-brand-mark">E</span> ElevAIte
        </Link>
        <div className="ob-dots">
          {[1, 2, 3].map((i) => (
            <span
              key={i}
              className={`ob-dot ${i < step ? 'done' : ''} ${i === step ? 'curr' : ''}`}
            />
          ))}
        </div>
        <Link className="ob-skip" href="/calendar">Skip setup</Link>
      </header>

      {/* Content */}
      <main className="ob-content">
        {step === 1 && (
          <section className="ob-step">
            <div className="ob-step__eyebrow">Step 1 of 3</div>
            <h1>Who are you using ElevAIte for?</h1>
            <p className="ob-step__sub">
              We&apos;ll set up color presets and shortcuts that fit. You can change this later.
            </p>
            <div className="ob-personas">
              {PERSONAS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  className={`ob-persona ${persona === p.id ? 'on' : ''}`}
                  onClick={() => setPersona(p.id)}
                >
                  <div className="ob-persona__emoji">{p.emoji}</div>
                  <h3 className="ob-persona__h">{p.title}</h3>
                  <p className="ob-persona__p">{p.desc}</p>
                  <div className="ob-persona__check">
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                      <path d="M20 6L9 17l-5-5" />
                    </svg>
                  </div>
                </button>
              ))}
            </div>
          </section>
        )}

        {step === 2 && (
          <section className="ob-step">
            <div className="ob-step__eyebrow">Step 2 of 3</div>
            <h1>Connect your calendars.</h1>
            <p className="ob-step__sub">
              Bring everything into one view. We never store your raw event data on our servers.
            </p>
            <div className="ob-accounts">
              <div className="ob-account connected">
                <div className="ob-account__icon">
                  <svg width="20" height="20" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.76h3.56c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.56-2.76c-.99.66-2.25 1.05-3.72 1.05-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0012 23z" />
                    <path fill="#FBBC05" d="M5.84 14.1A6.6 6.6 0 015.5 12c0-.73.13-1.44.34-2.1V7.06H2.18A11 11 0 001 12c0 1.77.42 3.45 1.18 4.94l3.66-2.84z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z" />
                  </svg>
                </div>
                <div style={{ flex: 1 }}>
                  <div className="ob-account__name">{userEmail}</div>
                  <div className="ob-account__type">Google · primary account</div>
                </div>
                <button type="button" className="ob-account__btn">✓ Connected</button>
              </div>
              <div className="ob-account">
                <div className="ob-account__icon">
                  <svg width="20" height="20" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.76h3.56c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.56-2.76c-.99.66-2.25 1.05-3.72 1.05-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0012 23z" />
                    <path fill="#FBBC05" d="M5.84 14.1A6.6 6.6 0 015.5 12c0-.73.13-1.44.34-2.1V7.06H2.18A11 11 0 001 12c0 1.77.42 3.45 1.18 4.94l3.66-2.84z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z" />
                  </svg>
                </div>
                <div style={{ flex: 1 }}>
                  <div className="ob-account__name">Add another Google account</div>
                  <div className="ob-account__type">Personal or work email</div>
                </div>
                <button type="button" className="ob-account__btn ob-account__btn--coral">Connect</button>
              </div>
              <div className="ob-account">
                <div className="ob-account__icon" style={{ background: '#000' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="#fff">
                    <path d="M17.05 12.04c0-2.94 2.42-4.36 2.53-4.42-1.38-2.02-3.53-2.3-4.3-2.33-1.83-.19-3.57 1.08-4.5 1.08-.92 0-2.35-1.05-3.86-1.02-1.99.03-3.82 1.15-4.84 2.93-2.07 3.58-.53 8.87 1.49 11.78 1 1.43 2.18 3.02 3.72 2.97 1.5-.06 2.06-.96 3.86-.96s2.31.96 3.88.93c1.6-.03 2.61-1.44 3.6-2.88 1.13-1.66 1.6-3.27 1.63-3.36-.04-.01-3.13-1.2-3.16-4.76zM14.83 4.42c.83-1 1.39-2.4 1.24-3.79-1.2.05-2.65.8-3.5 1.8-.77.88-1.44 2.31-1.26 3.67 1.33.1 2.69-.68 3.52-1.68z" />
                  </svg>
                </div>
                <div style={{ flex: 1 }}>
                  <div className="ob-account__name">Apple iCloud</div>
                  <div className="ob-account__type">Personal events · coming soon</div>
                </div>
                <button type="button" className="ob-account__btn" disabled>Connect</button>
              </div>
              <div className="ob-account">
                <div className="ob-account__icon" style={{ background: '#0078d4' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="#fff">
                    <path d="M2 4h10v6H2zm0 7h10v6H2zm11-7h9v6h-9zm0 7h9v6h-9z" />
                  </svg>
                </div>
                <div style={{ flex: 1 }}>
                  <div className="ob-account__name">Microsoft Outlook</div>
                  <div className="ob-account__type">Personal or work · coming soon</div>
                </div>
                <button type="button" className="ob-account__btn" disabled>Connect</button>
              </div>
            </div>
          </section>
        )}

        {step === 3 && (
          <section className="ob-step">
            <div className="ob-step__eyebrow">Step 3 of 3</div>
            <h1>Three things worth knowing.</h1>
            <p className="ob-step__sub">
              ElevAIte is keyboard-first. These shortcuts get you 80% of the way.
            </p>
            <div className="ob-tour">
              <div className="ob-tour-card">
                <div className="ob-tour-vis" style={{ background: 'var(--bg)' }}>
                  <div style={{
                    position: 'absolute', inset: 10,
                    background: 'var(--bg)',
                    border: '1px solid var(--hairline-strong)',
                    borderRadius: 6,
                    boxShadow: 'var(--shadow)',
                    padding: '6px 8px',
                    fontSize: 10,
                  }}>
                    <div style={{ color: 'var(--text-3)', borderBottom: '1px solid var(--hairline)', paddingBottom: 4, marginBottom: 4 }}>
                      Type a command…
                    </div>
                    <div style={{
                      padding: '2px 4px', borderRadius: 3,
                      background: 'var(--coral-subtle)', color: 'var(--coral-strong, var(--coral))',
                      display: 'flex', justifyContent: 'space-between',
                    }}>
                      Go to today<span className="ob-kbd" style={{ fontSize: 9 }}>T</span>
                    </div>
                  </div>
                </div>
                <div className="ob-tour-card__kbd"><span className="ob-kbd">⌘K</span></div>
                <h3 className="ob-tour-card__h">Command palette</h3>
                <p className="ob-tour-card__p">Search events, jump to dates, run any action.</p>
              </div>

              <div className="ob-tour-card">
                <div className="ob-tour-vis">
                  <div style={{
                    position: 'absolute', inset: 6,
                    display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 3,
                  }}>
                    <div style={{ background: 'var(--surface)', borderRadius: 3 }} />
                    <div style={{ background: 'var(--surface)', borderRadius: 3, position: 'relative' }}>
                      <div style={{
                        position: 'absolute', top: 8, left: 3, right: 3, height: 36,
                        background: 'var(--coral-subtle)',
                        border: '1.5px dashed var(--coral)',
                        borderRadius: 3,
                      }} />
                    </div>
                    <div style={{ background: 'var(--surface)', borderRadius: 3 }} />
                  </div>
                </div>
                <div className="ob-tour-card__kbd"><span className="ob-kbd">Drag</span></div>
                <h3 className="ob-tour-card__h">Drag to create</h3>
                <p className="ob-tour-card__p">
                  Drag any empty slot in the grid to block off time — no popups.
                </p>
              </div>

              <div className="ob-tour-card">
                <div className="ob-tour-vis">
                  <div style={{
                    position: 'absolute', inset: 10,
                    background: 'var(--surface)',
                    borderRadius: 5,
                    padding: '7px 10px',
                    fontSize: 9, color: 'var(--text-2)',
                  }}>
                    <div style={{
                      fontFamily: '"Geist Mono", monospace',
                      padding: '3px 5px',
                      background: 'var(--bg)',
                      borderRadius: 3,
                      border: '1px solid var(--hairline)',
                      marginBottom: 5,
                      fontSize: 8.5,
                    }}>
                      /book/your-handle/30min
                    </div>
                    <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
                      <span style={{ padding: '2px 4px', fontSize: 8, border: '1px solid var(--coral)', borderRadius: 3, color: 'var(--coral-strong, var(--coral))' }}>Mon 2:00</span>
                      <span style={{ padding: '2px 4px', fontSize: 8, border: '1px solid var(--coral)', borderRadius: 3, color: 'var(--coral-strong, var(--coral))' }}>Tue 11:00</span>
                    </div>
                  </div>
                </div>
                <div className="ob-tour-card__kbd"><span className="ob-kbd">/scheduling</span></div>
                <h3 className="ob-tour-card__h">Share availability</h3>
                <p className="ob-tour-card__p">
                  Send a scheduling link with your free slots in seconds.
                </p>
              </div>
            </div>
          </section>
        )}
      </main>

      {/* Bottom */}
      <footer className="ob-bottom">
        <button className={`ob-back ${step === 1 ? 'hide' : ''}`} onClick={back}>← Back</button>
        <button className="ob-next" onClick={next} disabled={finishing}>
          {step === 3 ? (finishing ? 'Opening…' : 'Open ElevAIte →') : 'Continue →'}
        </button>
      </footer>
    </div>
  );
}
