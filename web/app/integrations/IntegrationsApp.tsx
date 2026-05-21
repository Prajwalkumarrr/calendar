'use client';

import { useMemo, useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { ProviderMeta, IntegrationDTO, ProviderId } from '@/lib/integrations';
import './integrations.css';

type Category = 'all' | 'conferencing' | 'communication' | 'productivity' | 'calendar';

const FILTERS: { id: Category; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'conferencing', label: 'Conferencing' },
  { id: 'calendar', label: 'Calendars' },
  { id: 'productivity', label: 'Productivity' },
  { id: 'communication', label: 'Chat' },
];

const CATEGORY_LABEL: Record<ProviderMeta['category'], string> = {
  conferencing: 'Conferencing',
  communication: 'Chat',
  productivity: 'Productivity',
  calendar: 'Calendars',
};

export function IntegrationsApp({
  signedIn,
  providers,
  connected,
  flash,
}: {
  signedIn: boolean;
  providers: ProviderMeta[];
  connected: IntegrationDTO[];
  flash: { connected?: string; error?: string; provider?: string };
}) {
  const router = useRouter();
  const [filter, setFilter] = useState<Category>('all');
  const [busyId, setBusyId] = useState<ProviderId | null>(null);
  const [, startTransition] = useTransition();

  const connectedMap = useMemo(() => {
    const m = new Map<ProviderId, IntegrationDTO>();
    for (const c of connected) m.set(c.provider, c);
    return m;
  }, [connected]);

  const visible = providers.filter((p) => filter === 'all' || p.category === filter);

  const banner = useMemo(() => {
    if (flash.connected) {
      const p = providers.find((x) => x.id === flash.connected);
      return { kind: 'ok' as const, text: `${p?.name ?? flash.connected} connected.` };
    }
    if (flash.error) {
      const pName = providers.find((x) => x.id === flash.provider)?.name;
      const labels: Record<string, string> = {
        missing_code_or_state: 'OAuth returned without a code. Try again.',
        invalid_state: 'OAuth state was invalid or expired. Try again.',
        provider_mismatch: 'Provider mismatch on callback. Try again.',
        unknown_provider: 'Unknown provider.',
        provider_not_wired: `${pName ?? 'That provider'} isn't wired up yet.`,
        token_exchange_failed: `Couldn't exchange the OAuth code for tokens.${pName ? ` Check ${pName} credentials.` : ''}`,
        callback_failed: 'OAuth callback failed unexpectedly.',
      };
      return { kind: 'err' as const, text: labels[flash.error] ?? `Error: ${flash.error}` };
    }
    return null;
  }, [flash, providers]);

  function connect(p: ProviderMeta) {
    if (!signedIn) {
      router.push(`/sign-in?callbackUrl=/integrations`);
      return;
    }
    if (p.status === 'coming-soon') return;
    setBusyId(p.id);
    window.location.href = `/api/integrations/${p.id}/connect`;
  }

  async function disconnect(p: ProviderMeta) {
    if (!signedIn) return;
    if (!confirm(`Disconnect ${p.name}?`)) return;
    setBusyId(p.id);
    try {
      const res = await fetch(`/api/integrations/${p.id}`, { method: 'DELETE' });
      if (!res.ok && res.status !== 404) {
        console.error('disconnect failed', await res.text());
      }
    } finally {
      setBusyId(null);
      startTransition(() => router.refresh());
    }
  }

  return (
    <div className="ig-shell">
      <header className="ig-nav">
        <div className="ig-nav__inner">
          <Link href="/" className="ig-nav__brand">
            <span className="ig-nav__mark">E</span>
            ElevAIte
          </Link>
          <nav className="ig-nav__links">
            <Link href="/home">Home</Link>
            <Link href="/calendar">Calendar</Link>
            <Link href="/scheduling">Scheduling</Link>
            <Link href="/integrations" style={{ color: 'var(--text)' }}>Integrations</Link>
          </nav>
          <span style={{ flex: 1 }} />
          {signedIn ? (
            <Link href="/settings" className="ig-nav__action">Settings</Link>
          ) : (
            <>
              <Link href="/sign-in" className="ig-nav__action">Sign in</Link>
              <Link href="/sign-up" className="ig-nav__cta">Get free</Link>
            </>
          )}
        </div>
      </header>

      <section className="ig-hero">
        <div className="ig-hero__bloom" />
        <div className="ig-hero__eyebrow">Integrations</div>
        <h1>Plays nicely with everything.</h1>
        <p>Connect ElevAIte to the apps you already live in. New integrations ship every few weeks.</p>
      </section>

      {banner && (
        <div className={`ig-banner ig-banner--${banner.kind}`}>
          {banner.text}
        </div>
      )}

      <div className="ig-filters">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            className={`ig-filter ${filter === f.id ? 'on' : ''}`}
            onClick={() => setFilter(f.id)}
          >
            {f.label}
          </button>
        ))}
      </div>

      <section className="ig-grid">
        {visible.map((p) => {
          const conn = connectedMap.get(p.id);
          const isBusy = busyId === p.id;
          const isComingSoon = p.status === 'coming-soon';
          const needsCreds = p.status === 'needs-credentials';

          return (
            <div key={p.id} className={`ig-card ${conn ? 'connected' : ''}`}>
              {p.status === 'beta' && <span className="ig-card__tag">Beta</span>}
              {isComingSoon && <span className="ig-card__tag ig-card__tag--soon">Soon</span>}
              {needsCreds && !conn && <span className="ig-card__tag ig-card__tag--warn">Needs setup</span>}

              <div className="ig-card__head">
                <div className="ig-card__logo" style={{ background: p.iconBg ?? '#1F1E1B' }}>
                  {p.iconText || p.name.charAt(0)}
                </div>
                <div>
                  <h3 className="ig-card__h">{p.name}</h3>
                  <div className="ig-card__cat">{CATEGORY_LABEL[p.category]}</div>
                </div>
              </div>

              <p className="ig-card__p">{p.description}</p>

              {conn && conn.accountInfo?.email && (
                <div className="ig-card__meta">
                  Signed in as <strong>{conn.accountInfo.email}</strong>
                </div>
              )}

              {needsCreds && !conn && p.envHint && (
                <div className="ig-card__hint">{p.envHint}</div>
              )}

              <div className="ig-card__actions">
                {conn ? (
                  <button
                    className="ig-card__btn ig-card__btn--ghost"
                    onClick={() => disconnect(p)}
                    disabled={isBusy}
                  >
                    {isBusy ? 'Disconnecting…' : 'Disconnect'}
                  </button>
                ) : isComingSoon ? (
                  <button className="ig-card__btn" disabled style={{ opacity: 0.5 }}>
                    Coming soon
                  </button>
                ) : needsCreds ? (
                  <button className="ig-card__btn" disabled title="Set the env vars above and restart">
                    Needs setup
                  </button>
                ) : (
                  <button
                    className="ig-card__btn"
                    onClick={() => connect(p)}
                    disabled={isBusy}
                  >
                    {isBusy ? 'Opening…' : 'Connect'}
                  </button>
                )}
                {conn && (
                  <span className="ig-card__status">
                    <span className="ig-card__dot" /> Connected
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </section>

      <section className="ig-cta">
        <div>
          <h2>Don't see what you need?</h2>
          <p>Tell us what to build next. We ship integrations every few weeks.</p>
          <a href="mailto:hello@elevaite.so?subject=Integration%20request" className="ig-cta__btn">
            Request an integration →
          </a>
        </div>
      </section>

      <footer className="ig-foot">
        <span>© 2026 ElevAIte, Inc.</span>
        <span style={{ flex: 1 }} />
        <Link href="/">Home</Link>
      </footer>
    </div>
  );
}
